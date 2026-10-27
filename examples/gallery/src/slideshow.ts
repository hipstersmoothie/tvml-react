// Typed wrapper for TVJS's undocumented `Slideshow` global: the system photo
// slideshow (the Photos/screensaver "Marimba" player, with its themes).
//
// Probed on tvOS 26.5 (TVMLKit's `-[TVJSSlideshow start:::]`, `append:`,
// `dismiss`). `Slideshow` is a singleton object, not a constructor.
//
//   Slideshow.start(images, options?, displayThemeOptions?)
//     images:  Array<string | { url: string; headers?: Record<string, string> }>
//              or { urls: [...], headers?: Record<string, string> } (common headers)
//     options: { showSettings?: boolean; settingsMode?: "all" }
//              showSettings opens the theme picker first.
//   Slideshow.append(images)   same `images` shapes, adds to the running show
//   Slideshow.dismiss()        pops the slideshow
//
// It's pushed onto the app's navigation stack, so Menu also dismisses it.

type SlideshowImages =
  | Array<string | { url: string; headers?: Record<string, string> }>
  | { urls: Array<string>; headers?: Record<string, string> };

export interface SlideshowOptions {
  /** Show the theme picker before the slideshow starts. */
  showSettings?: boolean;
  settingsMode?: "all";
}

interface TVJSSlideshow {
  start(images: SlideshowImages, options?: SlideshowOptions, displayThemeOptions?: object): void;
  append(images: SlideshowImages): void;
  dismiss(): void;
}

function slideshow(): TVJSSlideshow | undefined {
  return (globalThis as unknown as { Slideshow?: TVJSSlideshow }).Slideshow;
}

export const isSlideshowAvailable = () => slideshow() !== undefined;

export function startSlideshow(urls: Array<string>, options: SlideshowOptions = {}): void {
  slideshow()?.start(urls, options);
}

export function appendToSlideshow(urls: Array<string>): void {
  slideshow()?.append(urls);
}

export function dismissSlideshow(): void {
  slideshow()?.dismiss();
}
