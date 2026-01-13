import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Tutorial',
      collapsed: false,
      items: [
        'tutorial/data-load',
        'tutorial/service',
        'tutorial/data-edit',
        'tutorial/di',
        'tutorial/tests',
        'tutorial/decorators'
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['concepts/operations', 'concepts/services', 'concepts/dependency-injection', 'concepts/memory-cleanup'],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        {
          type: 'category',
          label: 'Services',
          items: [
            'api/services/dependency',
            'api/services/service',
          ],
        },
        {
          type: 'category',
          label: 'Decorators',
          items: [
            'api/decorators/operation',
            'api/decorators/daemon',
            'api/decorators/inject',
          ],
        },
        {
          type: 'category',
          label: 'Hooks',
          items: [
            'api/hooks/use-saga',
            'api/hooks/use-service',
            'api/hooks/use-operation',
            'api/hooks/use-service-consumer',
            'api/hooks/use-di',
          ],
        },
        {
          type: 'category',
          label: 'Components',
          items: [
            'api/components/root',
            'api/components/operation',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: ['advanced/ssr'],
    },
  ],
};

export default sidebars;
