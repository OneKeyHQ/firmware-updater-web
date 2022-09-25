import ConnectImage from '@/images/connect-device.svg';

export default function SearchTimeout() {
  return (
    <div className="flex flex-col justify-center items-center">
      <h1 className="text-2xl font-normal">请检查连接工具并连接您的设备</h1>
      <img src={ConnectImage} className="self-center h-60" alt="" />
      <p>
        为防止通信错误，请确保您的设备已经正常通过 USB 连接计算机。
        正在搜索您的设备...
      </p>
      <p>Onekey Bridge 正在运行，版本: 2.1.0</p>
      <p>搜索设备时间过长，请您通过以下方式排查连接问题：</p>
      <p>检查是否正确安装和运行 Onekey Bridge</p>
      <p>刷新您的浏览器页面或更换浏览器重试</p>
      <p>尝试更换连接线和接口</p>
      <p>
        如果以上方式没有帮助，
        <a className="text-brand-500" href="https://help.onekey.so/hc/zh-cn">
          请联系技术支持
        </a>
      </p>
    </div>
  );
}
