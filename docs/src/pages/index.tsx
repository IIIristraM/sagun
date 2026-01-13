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
            SPA development framework based on redux-saga and MVC pattern
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
    title: translate({ id: 'homepage.featureDecoupledLogic.title', message: 'Decoupled business logic' }),
    description: translate({
      id: 'homepage.featureDecoupledLogic.description',
      message: 'Keep your business logic separate from UI. Split it into small, reusable services.',
    }),
  },
  {
    title: translate({ id: 'homepage.featureDI.title', message: 'Dependency injection' }),
    description: translate({
      id: 'homepage.featureDI.description',
      message: 'Built-in DI container for managing service dependencies. Testing business logic is a breeze.',
    }),
  },
  {
    title: translate({ id: 'homepage.featureMemoryManagement.title', message: 'Memory management' }),
    description: translate({
      id: 'homepage.featureMemoryManagement.description',
      message: 'The framework automatically cleans up unused data in the store.',
    }),
  },
  {
    title: translate({ id: 'homepage.featureRedux.title', message: 'Redux without drawbacks' }),
    description: translate({
      id: 'homepage.featureRedux.description',
      message: 'Familiar single state and no boilerplate. Easy to integrate into existing Redux applications.',
    }),
  },
  {
    title: translate({ id: 'homepage.featureReduxSaga.title', message: 'Full power of redux-saga inside' }),
    description: translate({
      id: 'homepage.featureReduxSaga.description',
      message: 'Automatic cancellation of outdated async operations, simple and powerful API for handling race conditions and duplicate requests.',
    }),
  },
  {
    title: translate({ id: 'homepage.featureSuspense.title', message: 'Suspense compatible' }),
    description: translate({
      id: 'homepage.featureSuspense.description',
      message: 'Use Suspense for any async logic starting from React 16.',
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
      description="Development framework for React applications based on redux-saga and MVC pattern"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

