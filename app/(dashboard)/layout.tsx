import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import { getApiLimit, getApiLimitCount } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

const DashboardLayout = async ({
    children
}: {
    children: React.ReactNode;
}) => {
    const apiLimitCount = await getApiLimitCount()
    const apiLimit = await getApiLimit()
    const isPro = await checkSubscription()
    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg- bg-gray-900">
                <Sidebar apiLimitCount={apiLimitCount} apiLimit={apiLimit} isPro={isPro} />
            </div>
            <main className="md:pl-72">
                <Navbar />
                {children}
            </main>

        </div>
    );
}

export default DashboardLayout;