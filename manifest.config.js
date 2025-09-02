import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  permissions: [
    'sidePanel',
    'contentSettings',
  ],
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  content_scripts: [{
    js: ['src/content/main.jsx'],
    matches: ['https://*/*', 'http://*/*'],
    run_at: 'document_idle',
    all_frames: false
  }],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  // web_accessible_resources not needed - CSS is now inlined via Vite ?inline
  // web_accessible_resources: [{
  //   resources: ['src/index.css'],
  //   matches: ['https://*/*', 'http://*/*']
  // }],
})
