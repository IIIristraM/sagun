import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Step-by-Step Guide',
      items: [
        'tutorial/data-load',
        'tutorial/service',
        'tutorial/data-edit',
        'tutorial/di',
        'tutorial/tests',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['concepts/operations', 'concepts/services'],
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
            'api/services/base-service',
            'api/services/service',
            'api/services/operation-service',
            'api/services/component-lifecycle-service',
            'api/services/uuid-generator',
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
            'api/components/contexts',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: ['advanced/dependency-injection', 'advanced/ssr', 'advanced/memory-cleanup'],
    },
  ],
};

export default sidebars;
