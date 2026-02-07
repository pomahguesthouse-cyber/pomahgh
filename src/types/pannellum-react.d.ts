declare module 'pannellum-react' {
  import { Component, ReactNode } from 'react';

  interface PannellumProps {
    id?: string;
    width?: string;
    height?: string;
    image?: string;
    haov?: number;
    vaov?: number;
    vOffset?: number;
    yaw?: number;
    pitch?: number;
    hfov?: number;
    minHfov?: number;
    maxHfov?: number;
    minPitch?: number;
    maxPitch?: number;
    minYaw?: number;
    maxYaw?: number;
    autoLoad?: boolean;
    autoRotate?: number;
    compass?: boolean;
    showControls?: boolean;
    showFullscreenCtrl?: boolean;
    showZoomCtrl?: boolean;
    mouseZoom?: boolean;
    keyboardZoom?: boolean;
    draggable?: boolean;
    preview?: string;
    previewTitle?: string;
    previewAuthor?: string;
    title?: string;
    author?: string;
    onLoad?: () => void;
    onScenechange?: (id: string) => void;
    onScenechangefadedone?: () => void;
    onError?: (err: string) => void;
    onErrorcleared?: () => void;
    onMousedown?: (event: unknown) => void;
    onMouseup?: (event: unknown) => void;
    onTouchstart?: (event: unknown) => void;
    onTouchend?: (event: unknown) => void;
    children?: ReactNode;
    [key: string]: unknown;
  }

  interface HotspotProps {
    id?: string;
    type: string;
    pitch: number;
    yaw: number;
    text?: string;
    URL?: string;
    cssClass?: string;
    createTooltipFunc?: (hotSpotDiv: HTMLElement, args: string) => void;
    createTooltipArgs?: string;
    handleClick?: (event: unknown) => void;
    handleClickArg?: unknown;
  }

  export class Pannellum extends Component<PannellumProps> {
    static Hotspot: typeof Component & { new (props: HotspotProps): Component<HotspotProps> };
    getViewer(): unknown;
  }
}
