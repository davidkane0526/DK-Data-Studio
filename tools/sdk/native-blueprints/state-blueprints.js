'use strict';

const NATIVE_PLUGIN_STATE_BLUEPRINTS=Object.freeze({
  '_template': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'aurora-pop-theme': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'connectivity-center': {
    'channels': [
      'busy',
      'checked',
      'enabled',
      'visible'
    ],
    'roles': [
      'dialog'
    ],
    'tabIndex': [],
    'aria': [
      'aria-label',
      'aria-modal'
    ],
    'keys': [
      'Enter'
    ],
    'counts': {
      'states': 11,
      'roles': 2,
      'a11y': 8,
      'keyboard': 2,
      'unmapped': 0
    }
  },
  'data-center': {
    'channels': [
      'checked',
      'enabled',
      'pressed',
      'selected',
      'visible'
    ],
    'roles': [],
    'tabIndex': [
      -1
    ],
    'aria': [
      'aria-label'
    ],
    'keys': [
      'Escape'
    ],
    'counts': {
      'states': 20,
      'roles': 2,
      'a11y': 1,
      'keyboard': 1,
      'unmapped': 0
    }
  },
  'flexible-import': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'pulse-analysis': {
    'channels': [
      'checked',
      'enabled',
      'visible'
    ],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 8,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'pulse-import': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'pulse-sampler-tool': {
    'channels': [
      'enabled'
    ],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 1,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'resonance-detector-robust': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'resonance-workbench': {
    'channels': [
      'checked',
      'current',
      'enabled',
      'pressed',
      'selected',
      'visible'
    ],
    'roles': [
      'dialog',
      'group'
    ],
    'tabIndex': [
      -1
    ],
    'aria': [
      'aria-label'
    ],
    'keys': [
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'Escape'
    ],
    'counts': {
      'states': 36,
      'roles': 3,
      'a11y': 6,
      'keyboard': 5,
      'unmapped': 0
    }
  },
  'scientific-data-contracts': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'shell-navigation': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'standard-transport-algorithms': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'status-monitor': {
    'channels': [
      'enabled',
      'pressed',
      'selected',
      'visible'
    ],
    'roles': [
      'group',
      'listbox',
      'option'
    ],
    'tabIndex': [
      0
    ],
    'aria': [
      'aria-label'
    ],
    'keys': [
      'Escape'
    ],
    'counts': {
      'states': 10,
      'roles': 4,
      'a11y': 5,
      'keyboard': 1,
      'unmapped': 0
    }
  },
  'ter-analysis': {
    'channels': [
      'checked',
      'enabled',
      'visible'
    ],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 5,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'thin-glass-theme': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'transfer-vth-lab': {
    'channels': [
      'checked'
    ],
    'roles': [
      'separator'
    ],
    'tabIndex': [],
    'aria': [
      'aria-orientation'
    ],
    'keys': [],
    'counts': {
      'states': 1,
      'roles': 1,
      'a11y': 1,
      'keyboard': 0,
      'unmapped': 0
    }
  },
  'workspace-safeguards': {
    'channels': [],
    'roles': [],
    'tabIndex': [],
    'aria': [],
    'keys': [],
    'counts': {
      'states': 0,
      'roles': 0,
      'a11y': 0,
      'keyboard': 0,
      'unmapped': 0
    }
  }
});
module.exports=Object.freeze({NATIVE_PLUGIN_STATE_BLUEPRINTS});
