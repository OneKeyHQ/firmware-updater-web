import { Header, Steps } from '@/components';

export default function Dashboard() {
  return (
    <div className="bg-gray-100">
      <Header />
      <main className="h-[calc(100vh-theme(space.16))]">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="h-auto min-h-96 rounded-sm  bg-white">
              <div className="text-gray-800 text-sm text-center py-2">
                初始化中，请稍后（请确保设备已经退出休眠模式）...
              </div>
              <Steps />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
