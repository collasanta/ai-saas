import FreeCounter from "@/components/free-counter";
import Heading from "@/components/heading";
import SubscriptionButton from "@/components/subscription-button";
import { getApiLimit, getApiLimitCount } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";
import { Settings } from "lucide-react";

const SettingsPage = async () => {
    const apiLimitCount = await getApiLimitCount()
    const apiLimit = await getApiLimit()
    return (
        <div>
            <Heading
                title="Settings"
                description="Manage account settings"
                icon={Settings}
                iconColor="text-gray-700"
                bgColor="bg-gray-700/10"
            />
            <div className="px-4 lg:px-8 space-x-4">
                <div className="text-muted-foreground text-sm">
                    <div className="max-w-[330px] mx-auto">
                        <FreeCounter apiLimitCount={apiLimitCount} apiLimit={apiLimit}  dark={true} />
                    </div>
                    {/* Total Credits */}
                    {/* {
                        isPro ? "You are currently on a pro plan" : "You are currently on a free plan"
                    } */}
                </div>
                {/* <SubscriptionButton isPro={isPro} /> */}
            </div>
        </div>
    );
}

export default SettingsPage;