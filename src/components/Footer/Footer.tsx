import { FunctionComponent, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { ILocale } from '../../types';

const LOCALE_MAPPING: {
  [TKey in ILocale]: string;
} = {
  'en-US': '',
  'zh-CN': '/zh_CN',
};

const BASE_URL = 'https://onekey.so';

export const Footer: FunctionComponent = () => {
  const intl = useIntl();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(
      `${BASE_URL}${LOCALE_MAPPING[intl.locale as ILocale]}/internal/footer/`
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
