import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['concepts/operations', 'concepts/services'],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/services',
        'api/decorators',
        'api/hooks',
        'api/components',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: ['advanced/dependency-injection', 'advanced/ssr'],
    },
  ],
};

export default sidebars;

