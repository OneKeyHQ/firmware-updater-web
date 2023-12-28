/* eslint-disable react/button-has-type */
import React, { FC, Fragment, ReactNode, useCallback, useMemo } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import cx from 'classnames';
import { Dialog, Transition } from '@headlessui/react';

export type ConfirmDialogProps = {
  /** Modal 标题 */
  title?: ReactNode;
  /** 是否可见 */
  visible?: boolean;
  // /** 点击确定回调，使用 any 来使 */
  // onOk?: () => void;
  /** 点击模态框右上角叉、取消按钮、Props.maskClosable 值为 true 时的遮罩层或键盘按下 Esc 时的回调 */
  onCancel?: () => void;
  /** 确认按钮文字 */
  // okText?: React.ReactNode;
  /** 取消按钮文字 */
  cancelText?: React.ReactNode;
  /** 内容 */
  content?: React.ReactNode;
  /** 是否显示 取消按钮 */
  okCancel?: boolean;
  /** 点击取消时调用 */
  close?: (...args: any[]) => void;
  children: any;
};

export const iconColors = {
  info: 'okd-text-gray-400',
  success: 'okd-text-green-400',
  error: 'okd-text-red-400',
  warn: 'okd-text-yellow-500',
  warning: 'okd-text-yellow-500',
  confirm: 'okd-text-yellow-500',
} as const;

const ConfirmDialog: FC<ConfirmDialogProps> = (props) => {
  const {
    close,
    onCancel,
    okCancel,
    cancelText,
    visible,
    title,
    content,
    children,
  } = props;

  const handleCancel = useCallback(() => {
    onCancel?.();
    close?.({ triggerCancel: true });
  }, [close, onCancel]);

  const cancelActionNode = useMemo(
    () =>
      okCancel && (
        <button
          type="button"
          className="okd-mt-3 okd-w-full okd-inline-flex okd-justify-center okd-rounded okd-border okd-border-gray-300 okd-shadow-sm okd-px-4 okd-py-2 okd-bg-white okd-text-base okd-font-medium okd-text-gray-700 hover:okd-bg-gray-50 focus:okd-outline-none focus:okd-ring-2 focus:okd-ring-offset-2 focus:okd-ring-brand-500 sm:okd-mt-0 sm:okd-text-sm"
          onClick={handleCancel}
        >
          {cancelText}
        </button>
      ),
    [cancelText, handleCancel, okCancel]
  );

  return (
    <Transition.Root show={visible} as={Fragment}>
      <Dialog
        as="div"
        auto-reopen="true"
        className="okd-fixed okd-z-10 okd-inset-0 okd-overflow-y-auto"
        onClose={handleCancel}
      >
        <div className="okd-flex okd-items-end okd-justify-center okd-min-h-screen okd-pt-4 okd-px-4 okd-pb-20 okd-text-center sm:okd-block sm:okd-p-0">
          <Transition.Child
            as={Fragment}
            enter="okd-ease-out okd-duration-300"
            enterFrom="okd-opacity-0"
            enterTo="okd-opacity-100"
            leave="okd-ease-in okd-duration-200"
            leaveFrom="okd-opacity-100"
            leaveTo="okd-opacity-0"
          >
            <Dialog.Overlay className="okd-fixed okd-inset-0 okd-bg-gray-500 okd-bg-opacity-75 okd-transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="okd-hidden sm:okd-inline-block sm:okd-align-middle sm:okd-h-screen">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="okd-ease-out okd-duration-300"
            enterFrom="okd-opacity-0 okd-translate-y-4 sm:okd-translate-y-0 sm:okd-scale-95"
            enterTo="okd-opacity-100 okd-translate-y-0 sm:okd-scale-100"
            leave="okd-ease-in okd-duration-200"
            leaveFrom="okd-opacity-100 okd-translate-y-0 sm:okd-scale-100"
            leaveTo="okd-opacity-0 okd-translate-y-4 sm:okd-translate-y-0 sm:okd-scale-95"
          >
            <div className="okd-inline-block okd-align-bottom okd-bg-white okd-rounded-lg okd-px-4 okd-pt-5 okd-pb-4 okd-text-left okd-overflow-hidden okd-ring-1 okd-ring-black okd-ring-opacity-5 okd-shadow-xl okd-transform okd-transition-all sm:okd-my-8 sm:okd-align-middle sm:okd-max-w-lg sm:okd-w-full sm:okd-p-6">
              <div>
                <div className="okd-mt-3 okd-text-center sm:okd-mt-5">
                  <Dialog.Title
                    as="h3"
                    className="okd-text-lg okd-leading-6 okd-font-medium okd-text-gray-900"
                  >
                    {title}
                  </Dialog.Title>
                  <div className="okd-mt-2">{content || children}</div>
                </div>
              </div>
              <div
                className={cx(
                  'okd-mt-5 sm:okd-mt-6 sm:okd-grid sm:okd-gap-3 sm:okd-grid-flow-row-dense'
                )}
              >
                {cancelActionNode}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ConfirmDialog;
