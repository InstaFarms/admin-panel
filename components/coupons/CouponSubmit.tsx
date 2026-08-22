import MyButton from "@/components/MyButton";
import DeleteCouponButton from "@/components/coupons/DeleteCouponButton";

interface CouponSubmitProps {
  loading: boolean;
  couponId?: string;
  className?: string;
}

export default function CouponSubmit({
  loading,
  couponId,
  className = "",
}: CouponSubmitProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <MyButton type="submit" loading={loading}>
        Submit
      </MyButton>
      {couponId && (
        <div onClick={(e) => e.preventDefault()}>
          <DeleteCouponButton id={couponId} />
        </div>
      )}
    </div>
  );
}
