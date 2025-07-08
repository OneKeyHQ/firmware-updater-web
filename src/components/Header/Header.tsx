import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Disclosure, Popover, Transition } from '@headlessui/react';
import { GlobeAsiaAustraliaIcon } from '@heroicons/react/20/solid';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { classNames } from '@/utils';
import { RootState } from '@/store';
import { setLocale } from '@/store/reducers/runtime';

const locales = [
  { name: '中文（简体）', value: 'zh-CN' },
  { name: 'English', value: 'en-US' },
];

// eslint-disable-next-line prefer-arrow-callback
const LocalePopover = React.memo(function LocalPopover() {
  const dispatch = useDispatch();
  const locale = useSelector((state: RootState) => state.runtime.locale);
  return (
    <Popover className="relative flex items-center hover:bg-gray-50 pr-4 pl-3">
      {({ open }) => (
        <>
          <Popover.Button
            className={classNames(
              'text-gray-900',
              'group inline-flex items-center rounded-md bg-white text-sm font-medium text-gray-900  hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
            )}
          >
            <GlobeAsiaAustraliaIcon
              className={classNames(
                open ? 'text-gray-600' : 'text-gray-600',
                'h-5 w-5 group-hover:text-gray-500'
              )}
              aria-hidden="true"
            />
            <span className="pl-2">
              {locales.find((k) => k.value === locale)?.name ?? locale}
            </span>
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-1/2 z-10 mt-3 w-36 -translate-x-1/2 transform px-2 sm:px-0 top-14">
              {({ close }) => (
                <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                  {locales.map((item) => (
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                    <div
                      key={item.value}
                      className="relative grid gap-6 bg-white px-3 py-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        dispatch(setLocale(item.value as any));
                        close();
                      }}
                    >
                      <p className="text-base font-medium text-gray-900 text-center">
                        {item.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
});

export default function Header() {
  const intl = useIntl();
  const navigation = [
    { name: intl.formatMessage({ id: 'TR_HOME' }), href: 'https://onekey.so/' },
    {
      name: intl.formatMessage({ id: 'TR_SUPPORT' }),
      href: 'https://help.onekey.so',
    },
  ];

  return (
    <div className="min-h-full">
      <Disclosure as="nav" className="bg-white shadow-sm">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 justify-between">
                <div className="flex flex-1 justify-between">
                  <div className="flex flex-shrink-0 items-center">
                    <img
                      className="block h-8 w-auto lg:hidden"
                      src="/static/onekey.png"
                      alt="OneKey"
                    />
                    <img
                      className="hidden h-8 w-auto lg:block"
                      src="/static/onekey.png"
                      alt="OneKey"
                    />
                  </div>
                  <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-4">
                    {navigation.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={classNames(
                          'flex items-center border-transparent text-gray-900 hover:bg-gray-50 hover:text-gray-800',
                          'block pl-3 pr-4 py-2 border-l-4 text-sm font-medium'
                        )}
                      >
                        {item.name}
                      </a>
                    ))}
                    <LocalePopover />
                  </div>
                </div>
                <div className="-mr-2 flex items-center sm:hidden">
                  {/* Mobile menu button */}
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 pt-2 pb-3">
                {navigation.map((item) => (
                  <Disclosure.Button
                    key={item.name}
                    as="a"
                    href={item.href}
                    className={classNames(
                      'flex items-center border-transparent text-gray-900 hover:bg-gray-50  hover:text-gray-800',
                      'block pl-3 pr-4 py-2 border-l-4 text-sm font-medium'
                    )}
                  >
                    {item.name}
                  </Disclosure.Button>
                ))}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}
