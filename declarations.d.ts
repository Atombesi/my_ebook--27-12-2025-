declare module 'react-window' {
  import { Component, CSSProperties } from 'react';

  export type ListChildComponentProps<T = any> = {
    index: number;
    style: CSSProperties;
    data: T;
    isScrolling?: boolean;
  };

  export class FixedSizeList extends Component<any, any> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: "auto" | "smart" | "center" | "end" | "start"): void;
  }
}

declare module 'react-virtualized-auto-sizer' {
  import { Component, ReactNode, CSSProperties } from 'react';

  export interface Size {
    height: number;
    width: number;
  }

  export interface AutoSizerProps {
    children: (size: Size) => ReactNode;
    className?: string;
    defaultHeight?: number;
    defaultWidth?: number;
    disableHeight?: boolean;
    disableWidth?: boolean;
    onResize?: (size: Size) => void;
    style?: CSSProperties;
  }

  export default class AutoSizer extends Component<AutoSizerProps> {}
}

declare module '@capawesome/capacitor-file-picker' {
  export interface FilePickerOptions {
    types?: string[];
    multiple?: boolean;
    readData?: boolean;
  }

  export interface PickedFile {
    blob?: Blob;
    data?: string;
    mimeType: string;
    name: string;
    path?: string;
    size: number;
  }

  export interface PickFilesResult {
    files: PickedFile[];
  }

  export interface FilePickerPlugin {
    pickFiles(options?: FilePickerOptions): Promise<PickFilesResult>;
  }

  export const FilePicker: FilePickerPlugin;
}

// FIX: Aggiunta dichiarazione per @capacitor/filesystem
declare module '@capacitor/filesystem' {
  export interface WriteFileOptions {
    path: string;
    data: string;
    directory?: string;
    encoding?: string;
    recursive?: boolean;
  }

  export interface WriteFileResult {
    uri: string;
  }

  export enum Directory {
    Documents = "DOCUMENTS",
    Data = "DATA",
    Library = "LIBRARY",
    Cache = "CACHE",
    External = "EXTERNAL",
    ExternalStorage = "EXTERNAL_STORAGE"
  }

  export enum Encoding {
    UTF8 = "utf8",
    ASCII = "ascii",
    UTF16 = "utf16"
  }

  export interface FilesystemPlugin {
    writeFile(options: WriteFileOptions): Promise<WriteFileResult>;
  }

  export const Filesystem: FilesystemPlugin;
}