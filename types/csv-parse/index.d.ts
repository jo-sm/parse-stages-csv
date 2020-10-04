/*
  Even though `csv-parse` supports async iteration, the types don't. This is a very minimal
  typing for the library, and at some point this should be integrated into the actual library.
 */
declare module 'csv-parse' {
  function parse<T>(input: Buffer, options: parse.Options): parse.ParserAsyncIterator<T>

  namespace parse {
    type Options = {
      columns: string[]
      cast: (value: string, context: { column: string }) => void
      relax_column_count: boolean
    }

    type ParserAsyncIterator<T> = {
      [Symbol.asyncIterator](): IterableIterator<T>
    }
  }

  export = parse;
}
