import Layout from '@theme/Layout';
import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import classnames from 'classnames';

import styles from './styles.module.css';

const features = [
  {
    title: 'What is Happo?',
    description:
      'Happo is screenshot testing for developers. Stop visual regressions, see the effect of style changes, and prevent bugs across multiple browsers and platforms.',
  },

  {
    title: 'What does Happo do?',
    description:
      'Happo takes screenshots in CI, compares them against a baseline, and shows you any differences.',
  },

  {
    title: 'How do I use Happo?',
    description:
      'Happo is easy to set up and use. You can start by adding a Happo API key to your project.',
  },
];

export default () => {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className="hero hero--primary">
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={classnames(
                'button button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('docs/getting-started')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {features && features.length > 0 && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map(({ imageUrl, title, description }, idx) => (
                  <div
                    key={idx}
                    className={classnames('col col--4', styles.feature)}
                  >
                    {imageUrl && (
                      <div className="text--center">
                        <img
                          className={styles.featureImage}
                          src={useBaseUrl(imageUrl)}
                          alt={title}
                        />
                      </div>
                    )}
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="text--center padding-vert--xl">
          <Link
            className="button button--primary button--lg"
            to={useBaseUrl('docs/getting-started')}
          >
            Learn more about Happo!
          </Link>
        </div>
      </main>
    </Layout>
  );
};
