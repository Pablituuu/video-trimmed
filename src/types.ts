export type Time = [start: number, end: number];

export interface VideoTransform {
  time?: Time;
  mute?: boolean;
}

