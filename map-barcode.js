"use strict"

/*
  Copyright (C) 2017  The University of Sydney Library

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


const _ = require('lodash')
const csv = require('csv')
const fs = require('fs')
const sierraDb = require('@sydneyunilibrary/sierra-db-as-promised')()


const optionDefinitions = [
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: [
      'Print the synopsis and usage, and then exit without doing anything.'
    ].join(' '),
  },
  {
    name: 'simple-output',
    alias: 's',
    type: Boolean,
    description: [
      'Output a file suitable for importing directly into Sierra create lists.',
      'See the OUTPUT MODES section below.',
    ].join(' '),
  },
  {
    name: 'skip',
    type: Number,
    defaultValue: 1,
    description: [
      'The number of lines in the input file before the actual data starts.',
    ].join(' '),
  },
  {
    name: 'column',
    alias: 'c',
    type: Number,
    defaultValue: 1,
    description: [
      'Which column number of the input file contains the barcodes.',
      'The first column is column number 1. Defaults to 1.' ,
    ].join(' '),
  },
  {
    name: 'input-file',
    type: String,
    defaultOption: true,
    typeLabel: '<file>',
    description: [
      'The path to a utf-8 csv file that has the barcodes.',
      '"-" means standard input. Defaults to "-".'
    ].join(' '),
  }
]


const usage = [
  {
    header: 'NAME',
    content: [
      'map-barcode.js - Map a file of item barcodes into a file of Sierra item record numbers'
    ],
  },
  {
    header: 'SYNOPSIS',
    content: 'node map-barcode.js [options] [<file>]',
  },
  {
    header: 'DESCRIPTION',
    content: [
      [
        '<file>, if given, should be the path to a utf-8 csv file with item barcodes in the first column.',
        'If <file> is not given, standard input is used instead.',
      ].join(' '),
      '',
      [
        'If the barcodes are not in the first column of the input file, use the -c/--column option',
        'to specify which column has the barcodes.',
      ].join(' '),
    ],
  },
  {
    header: 'OPTIONS',
    optionList: optionDefinitions,
  },
  {
    header: 'OUPUT MODES',
    content: [
      [
        'When the -s/--simple-output option is given, simple output mode is used.',
        'When the -s/--simple-output option is not given, advanced output mode is used.'
      ].join(' '),
      '',
      [
        'In simple output mode, only the item record number is output.',
        'A file saved from simple output mode can be use directly imported in a Sierra review file.',
        'But any barcodes the don\'t match an item record, or any barcodes that match multiple barcodes',
        'are not mapped into the output. In other words, only barcodes that match a single item record',
        'is mapped in simple output mode. Lines skipped in the input file are not output.' ,
      ].join(' '),
      '',
      [
        'In advanced output mode, 2 additional columns are added to the start of row of the input csv file.',
        'The first column indicates the mapping result and the second column has one or more item records numbers.',
        'If the first column is "x", then the barcode in the row did not match any item records and the second column will be blank',
        'If the first column is "-", then the barcode match a single item record and the second column will have the item record number.',
        'If the first column is "*", then the barcode matches multiple item records',
        'and the second column has the item records numbers sepearated by a semicolon.',
        'Lines skipped in the input file are output with two empty columns prepended.'
      ].join(' '),
    ],
  },
]


const options = require('command-line-args')(optionDefinitions)
if (options.help) {
  console.log(require('command-line-usage')(usage))
  process.exit(-1)
}


function loadInputFile() {
  return new Promise((resolve, reject) => {
    try
    {
      let inputData = []
      let inputFilePath = options['input-file'] || '-'

      let csvParseStream = csv.parse()
      csvParseStream
      .on('error', (err) => {
        // console.log('loadInputFile csvParseStream error')
        reject(err)
      })
      .on('end', () => {
        // console.log('loadInputFile csvParseStream end')
        resolve({inputData})
      })
      .on('data', data => {
        // console.log('loadInputFile csvParseStream data')
        // console.dir(data, { colors: true })
        inputData.push(data)
      })

      let inputFileStream =
        inputFilePath === '-'
        ? process.stdin
        : fs.createReadStream(options['input-file'], { encoding: 'utf-8' })
      inputFileStream
      .on('error', (err) => {
        console.log('loadInputFile inputFileStream error')
        reject(err)
      })
      .pipe(csvParseStream)

    } catch (err) {
      reject(err)
    }
  })
}


async function mapToItemRecord(state) {
  const { inputData } = state

  const barcodeColumn = options.column - 1
  if (barcodeColumn < 0) {
    barcodeColumn = 0
  }

  let mapping = []

  await sierraDb.task(async t => {
    for (let row of inputData.slice(options.skip)) {
      const barcode = row[barcodeColumn]
      // console.log('Mapping barcode %s', barcode)
      const result = await t.any(
        `
           SELECT md.record_num
             FROM phrase_entry AS pe
                  JOIN record_metadata AS md ON md.id = pe.record_id
            WHERE md.record_type_code = 'i'
                  AND pe.index_tag || pe.index_entry = 'b' || $1::VARCHAR
        `,
        barcode.toLowerCase()
      )
      mapping.push(result.map(_1 => _1.record_num))
    }
  })

  return Object.assign({}, state, { mapping })
}


function dumpState(state) {
  return new Promise((resolve, reject) => {
    try {
      console.dir(state, { colors: true, depth: null} )
      resolve(state)
    } catch (err) {
      reject(err)
    }
  })
}


function simpleOutput(state) {
  const { mapping } = state

  for (let m of mapping) {
    if (m.length === 1) {
      console.log('i%d', m[0])
    }
  }

  return state
}


function advancedOutput(state) {
  return new Promise((resolve, reject) => {
    try {

      const { inputData, mapping } = state

      let csvStringify = csv.stringify()
      csvStringify.on('finish', () => resolve(state))
      csvStringify.pipe(process.stdout)

      for (let r of _.take(inputData, options.skip)) {
        csvStringify.write(['', '', ...r])
      }
      for (let [r, m] of _.zip(_.drop(inputData, options.skip), mapping)) {
        csvStringify.write([
          (
            m.length === 0
            ? 'x'
            : m.length === 1
            ? '-'
            : '*'
          ),
          m.map(_1 => `i${_1}`).join(';'),
          ...r
        ])
      }
      csvStringify.end()

    } catch (err) {
      reject(err)
    }
  })
}



loadInputFile()
// .then(dumpState)
.then(mapToItemRecord)
.then(options['simple-output'] ? simpleOutput : advancedOutput)
.then(() => process.exit(0))
.catch(err => {
  console.error(err)
  process.exit(1)
})
