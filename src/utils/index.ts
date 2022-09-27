import { Buffer } from 'buffer';

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const arrayBufferToBuffer = (ab: any): any => {
  const buffer: any = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = view[i];
  }
  return buffer;
};

export default arrayBufferToBuffer;
