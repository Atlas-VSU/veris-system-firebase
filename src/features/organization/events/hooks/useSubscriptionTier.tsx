import { useAuth } from "@/hooks/useAuth"
import { getOrgById } from "@/firebase/organization";
import { useEffect, useState } from "react"

export function useSubscriptionTier() {
    const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
    const user = useAuth();

    useEffect(() => {
        const fetchOrg = async () => {
            const org = await getOrgById(user?.user?.orgId || '');
            setSubscriptionTier(org?.subscriptionTier!);
        }
        fetchOrg();
    }, [user])

    return { subscriptionTier };
}