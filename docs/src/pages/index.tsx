import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, { translate } from '@docusaurus/Translate';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">
          <Translate id="homepage.tagline">
            Strongly-typed service-based isomorphic architecture on top of redux-saga
          </Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started"
          >
            <Translate id="homepage.getStarted">Get Started</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

type FeatureItem = {
  title: string;
  description: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: translate({ id: 'homepage.feature1.title', message: 'Decoupled Business Logic' }),
    description: translate({
      id: 'homepage.feature1.description',
      message: 'Keep your business logic separate from React components. Split it into small, reusable services.',
    }),
  },
  {
    title: translate({ id: 'homepage.feature2.title', message: 'Reduced Redux Boilerplate' }),
    description: translate({
      id: 'homepage.feature2.description',
      message: 'Single reducer for all operations. Actions are auto-generated from service methods.',
    }),
  },
  {
    title: translate({ id: 'homepage.feature3.title', message: 'SSR Compatible' }),
    description: translate({
      id: 'homepage.feature3.description',
      message: 'Server-side rendering support without duplicating logic. Works with React 16-19.',
    }),
  },
  {
    title: translate({ id: 'homepage.feature4.title', message: 'Dependency Injection' }),
    description: translate({
      id: 'homepage.feature4.description',
      message: 'Built-in DI container for managing service dependencies with TypeScript decorators.',
    }),
  },
  {
    title: translate({ id: 'homepage.feature5.title', message: 'Fully Typed' }),
    description: translate({
      id: 'homepage.feature5.description',
      message: 'Written in TypeScript with strong typing for operations, services, and hooks.',
    }),
  },
  {
    title: translate({ id: 'homepage.feature6.title', message: 'Suspense Ready' }),
    description: translate({
      id: 'homepage.feature6.description',
      message: 'Native React Suspense integration for loading states and error boundaries.',
    }),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md feature-item">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Strongly-typed service-based isomorphic architecture on top of redux-saga"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

