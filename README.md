# item-records-tools
A collection of tools for working with Sierra item records.



## Getting started

```
git clone https://github.com/SydneyUniLibrary/course-record-tools.git
cd course-record-tools
git checkout v1
npm install
```

Create a .env file inside the course-record-tools directory (next to the pacakge.json file), like the following.

```
SIERRA_DB_HOST=sierra.library.edu
SIERRA_DB_USER=me
SIERRA_DB_PASSWORD=secret
```

> **Never** commit this .env file into a source control repository.



## Mapping item barcodes to item record numbers

```
AME

  map-barcode.js - Map a file of item barcodes into a file of Sierra item
  record numbers

SYNOPSIS

  node map-barcode.js [options] [<file>]

DESCRIPTION

  <file>, if given, should be the path to a utf-8 csv file with item barcodes
  in the first column. If <file> is not given, standard input is used instead.

  If the barcodes are not in the first column of the input file, use the
  -c/--column option to specify which column has the barcodes.

OPTIONS

  -h, --help             Print the synopsis and usage, and then exit without doing anything.
  -s, --simple-output    Output a file suitable for importing directly into Sierra create lists. See
                         the OUTPUT MODES section below.
  --skip number          The number of lines in the input file before the actual data starts.
  -c, --column number    Which column number of the input file contains the barcodes. The first column
                         is column number 1. Defaults to 1.
  --input-file <file>    The path to a utf-8 csv file that has the barcodes. "-" means standard input.
                         Defaults to "-".

OUPUT MODES

  When the -s/--simple-output option is given, simple output mode is used. When
  the -s/--simple-output option is not given, advanced output mode is used.

  In simple output mode, only the item record number is output. A file saved
  from simple output mode can be use directly imported in a Sierra review file.
  But any barcodes the don't match an item record, or any barcodes that match
  multiple barcodes are not mapped into the output. In other words, only
  barcodes that match a single item record is mapped in simple output mode.
  Lines skipped in the input file are not output.

  In advanced output mode, 2 additional columns are added to the start of row
  of the input csv file. The first column indicates the mapping result and the
  second column has one or more item records numbers. If the first column is
  "x", then the barcode in the row did not match any item records and the
  second column will be blank If the first column is "-", then the barcode
  match a single item record and the second column will have the item record
  number. If the first column is "*", then the barcode matches multiple item
  records and the second column has the item records numbers sepearated by a
  semicolon. Lines skipped in the input file are output with two empty columns
  prepended.
```



## License

Copyright (c) 2017  The University of Sydney Library

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
