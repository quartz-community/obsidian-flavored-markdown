interface Window {
  addCleanup(callback: () => void): void;
  /** Absolute URL of the site's static/ directory (Quartz 5.1+; undefined on older versions). */
  quartzStaticUrl?: string;
}
