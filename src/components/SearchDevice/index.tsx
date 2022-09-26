import ConnectImage from '@/images/connect-device.svg';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function SearchDevice() {
  const pageStatus = useSelector(
    (state: RootState) => state.runtime.pageStatus
  );
  const bridgeVersion = useSelector(
    (state: RootState) => state.runtime.bridgeVersion
  );

  return (
    <div className="flex flex-col justify-center items-center py-4">
      <h1 className="text-3xl font-normal">请检查连接工具并连接您的设备</h1>
      <img src={ConnectImage} className="self-center h-60" alt="" />
      <p className="text-sm font-normal text-gray-500">
        为防止通信错误，请确保您的设备已经正常通过 USB 连接计算机。
        正在搜索您的设备...
      </p>
      <p className="text-xs font-normal text-gray-500 py-3">
        Onekey Bridge 正在运行，版本: {bridgeVersion}
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
      ) : null}
    </div>
  );
}
