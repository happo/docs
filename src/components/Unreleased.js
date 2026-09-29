import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

/**
 * Labels docs that describe server behavior not in production yet. Only
 * rendered where unreleased docs are shown: production builds remove every
 * `<Unreleased>` block before it gets here (src/remark/unreleased.js).
 * Checking again costs nothing, and keeps a block the plugin missed from
 * reaching docs.happo.io.
 */
export default function Unreleased({ page = false, inline = false, children }) {
  const { siteConfig } = useDocusaurusContext();
  if (!siteConfig.customFields.showUnreleased) {
    return null;
  }
  // Inside a paragraph (the remark plugin says which), so phrasing content only.
  if (inline) {
    return (
      <span className="unreleased unreleased--inline">
        <span className="unreleased__label">Unreleased</span> {children}
      </span>
    );
  }
  return (
    <div className="unreleased">
      <p className="unreleased__label">
        {page
          ? 'Unreleased page: left out of docs.happo.io until the change it describes is deployed.'
          : 'Unreleased: left out of docs.happo.io until the change it describes is deployed.'}
      </p>
      {children}
    </div>
  );
}
