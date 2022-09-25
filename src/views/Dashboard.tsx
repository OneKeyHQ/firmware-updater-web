import {
  Header,
  Steps,
  Description,
  ReleaseInfo,
  UploadFirmware,
  ConfirmUpdate,
} from '@/components';

export default function Dashboard() {
  return (
    <div className="bg-gray-100">
      <Header />
      <main className="h-[calc(100vh-theme(space.16))]">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="h-auto min-h-96 rounded-sm  bg-white px-[10%]">
              {/* <div className="text-gray-800 text-sm text-center py-2">
                初始化中，请稍后（请确保设备已经退出休眠模式）...
              </div> */}
              <div className="py-4">
                <Steps />
              </div>
              <div className="content">
                <h1 className="text-3xl text-center font-light py-4">
                  安装固件
                </h1>
                <div className="flex flex-row-reverse">
                  <div className="w-1/2">
                    <Description text="状态" value="未连接" />
                    <Description text="固件版本" value="3.1.0" />
                    <Description text="蓝牙固件版本" value="2.0.4" />
                    <Description text="设备类型" value="OneKey Touch" />
                    <Description
                      text="设备序列号"
                      value="TC01WBD202207290806060000020"
                    />
                  </div>
                </div>
                <ReleaseInfo />
                <UploadFirmware />
                <ConfirmUpdate />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
