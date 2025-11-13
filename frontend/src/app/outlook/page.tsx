import OutlookIntegration from '@/components/OutlookIntegration';

export default function OutlookPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Microsoft Outlook Integration</h1>
        <p className="text-gray-300">
          Connect your World Congress system with Microsoft Outlook for real-time calendar sync and automated meeting management.
        </p>
      </div>
      <OutlookIntegration />
    </div>
  );
}
