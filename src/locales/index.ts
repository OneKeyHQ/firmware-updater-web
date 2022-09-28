import React from 'react';
import type { IntlShape, MessageDescriptor } from 'react-intl';

import zhCN from './zh-CN.json';
import enUS from './en-US.json';

export default {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export const intlRef = React.createRef<IntlShape>();

export function formatMessage(
  descriptor: MessageDescriptor,
  values?: Record<string, any>
) {
  return intlRef?.current?.formatMessage(descriptor, values);
}
