import { FunctionComponent, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { ILocale } from '../../types';

const LOCALE_MAPPING: {
  [TKey in ILocale]: string;
} = {
  'en-US': 'en',
  'zh-CN': 'zh',
};

export const Footer: FunctionComponent = () => {
  const intl = useIntl();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/footer/${LOCALE_MAPPING[intl.locale as ILocale]}.html`)
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
