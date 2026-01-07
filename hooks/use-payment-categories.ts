import { useQuery } from "@tanstack/react-query";
import { getPaymentCategories } from "@/lib/api-client";
import { PaymentCategory } from "@/components/tasks/types";

export const usePaymentCategories = () => {
  const { data, ...rest } = useQuery<PaymentCategory[]>({
    queryKey: ["payment-categories"],
    queryFn: () => getPaymentCategories().then((res) => res.data),
  });
  return { data, ...rest };
};