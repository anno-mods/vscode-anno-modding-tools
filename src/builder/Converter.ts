export interface ILogger {
  log: (text: string) => void;
  warn: (text: string) => void;
  error: (text: string) => void;
}

export abstract class Converter {
  protected _logger: ILogger = { log: (t) => {}, warn: (t) => {}, error: (t) => {}};
  protected _asAbsolutePath = (relative: string) => relative;

  abstract getName(): string;

  public init(logger: ILogger, asAbsolutePath: (relative: string) => string) {
    this._logger = logger;
    this._asAbsolutePath = asAbsolutePath;
  }
  
  abstract run(files: string[], sourceFolder: string, outFolder: string, options: { 
    cache: string,
    modJson: any,
    converterOptions: any,
    dontOverwrite?: boolean
  }): Promise<void>;
}
