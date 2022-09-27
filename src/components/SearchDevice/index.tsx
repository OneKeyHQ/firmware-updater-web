/* eslint-disable no-nested-ternary */
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@onekeyhq/ui-components';
import ConnectImage from '@/images/connect-device.svg';
import { getSystemKey } from '@/utils';
import { setPageStatus } from '@/store/reducers/runtime';
import Select from '../Select';

type Option = { label: string; value: string };

export default function SearchDevice() {
  const dispatch = useDispatch();
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );
  const bridgeVersion = useSelector(
    (state: RootState) => state.runtime.bridgeVersion
  );
  const bridgeReleaseMap = useSelector(
    (state: RootState) => state.runtime.bridgeReleaseMap
  );

  const [options, setOptions] = useState<Option[]>([]);
  const [currentTarget, setCurrentTarget] = useState<Option | null>(null);
  useEffect(() => {
    const system = getSystemKey();
    setCurrentTarget(bridgeReleaseMap[system]);

    const items = Object.values(bridgeReleaseMap)
      .filter((item) => item.value && item.value.length)
      .map((item) => item);
    setOptions(items);
  }, [bridgeReleaseMap]);

  return (
    <div className="flex flex-col justify-center items-center py-4">
      <h1 className="text-3xl font-normal">请检查连接工具并连接您的设备</h1>
      <img src={ConnectImage} className="self-center h-60" alt="" />
      <p className="text-sm font-normal text-gray-500">
        为防止通信错误，请确保您的设备已经正常通过 USB 连接计算机。
        正在搜索您的设备...
      </p>
      <p className="text-xs font-normal text-gray-500 py-3">
        {pageStatus === 'uninstall-bridge' || pageStatus === 'download-bridge'
          ? '未识别到设备？尝试安装 Onekey Bridge！Onekey Bridge 是一个能够将设备和浏览器连接的工具。'
          : `Onekey Bridge 正在运行，版本: ${bridgeVersion}`}
      </p>
      {pageStatus === 'search-timeout' ? (
        <>
          <p className="text-sm font-normal text-gray-500">
            搜索设备时间过长，请您通过以下方式排查连接问题：
          </p>
          <div className="flex flex-col items-start justify-start">
            <p className="text-sm font-normal text-gray-500 pt-4 pb-1">
              • 检查是否正确安装和运行 Onekey Bridge
            </p>
            <p className="text-sm font-normal text-gray-500 py-1">
              • 刷新您的浏览器页面或更换浏览器重试
            </p>
            <p className="text-sm font-normal text-gray-500 py-1">
              • 尝试更换连接线和接口
            </p>
            <p className="text-sm font-normal text-gray-500 py-1">
              • 如果以上方式没有帮助，
              <a
                className="text-brand-500"
                href="https://help.onekey.so/hc/zh-cn"
              >
                请联系技术支持
              </a>
            </p>
          </div>
        </>
      ) : pageStatus === 'uninstall-bridge' ? (
        currentTarget && (
          <div className="flex items-center p-6">
            <div className="w-52 pr-3">
              <Select
                options={options}
                defaultValue={currentTarget}
                onChange={(e) => {
                  setCurrentTarget(e);
                }}
              />
            </div>
            <a href={currentTarget.value} className="w-28 flex">
              <Button
                href={currentTarget.value}
                type="primary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  dispatch(setPageStatus('download-bridge'));
                }}
              >
                下载
              </Button>
            </a>
          </div>
        )
      ) : pageStatus === 'download-bridge' ? (
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-normal text-gray-500 pt-3 pb-1">
            1.正在等待安装
          </p>
          <p className="text-sm font-normal text-gray-500 py-2">
            2.双击以运行安装程序
          </p>
          <p className="text-sm font-normal text-gray-500 py-2">
            3.正在检测 Onekey Bridge 是否已安装...
          </p>
        </div>
      ) : null}
    </div>
  );
}
