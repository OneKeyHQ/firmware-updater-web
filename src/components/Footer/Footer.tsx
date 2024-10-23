import { FunctionComponent, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { ILocale } from '../../types';

const LOCALE_MAPPING: {
  [TKey in ILocale]: string;
} = {
  'en-US': '',
  'zh-CN': '/zh_CN',
};

export const Footer: FunctionComponent = () => {
  const intl = useIntl();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(
      `https://portal-git-feat-page-footer-for-ex-a3e45d-yggdrasilqhs-projects.vercel.app${
        LOCALE_MAPPING[intl.locale as ILocale]
      }/internal/footer/`
    )
      .then((response) => response.text())
      .then((data) => {
        const element = containerRef.current;

        if (!element) {
          return;
        }

        const shadowRoot =
          element.shadowRoot ?? element.attachShadow({ mode: 'open' });

        shadowRoot.innerHTML = data;
      })
      .catch(console.error);
  }, [intl.locale]);

  return <div ref={containerRef} />;
};
