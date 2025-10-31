// src/components/.../CartPopoverConnected.jsx
/**
 * Summary:
 * Redux-connected cart popover wiring currency and actions.
 
 */

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import CartPopover from "./CartPopover";
import {
  selectCartItemsNormalized,
  selectCartSubtotalBase,
  removeItem,
} from "../../../store/slices/cartSlice";
import { selectCurrency, selectRates } from "../../../store/slices/settingsSlice";
import { formatCurrency } from "../../../utils/money";

export default function CartPopoverConnected({
  open,
  anchorEl,
  onClose,
  onCheckout,
  onViewCart,
  onViewProduct,
}) {
  const dispatch = useDispatch();

  const lines = useSelector(selectCartItemsNormalized);
  const subtotalBase = useSelector(selectCartSubtotalBase);
  const currency = useSelector(selectCurrency);
  const rates = useSelector(selectRates);
  const fmt = (v) => formatCurrency(v, rates, currency);

  return (
    <CartPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      items={lines.map((l) => ({
        id: l.id,
        title: l.title,
        image: l.image,
        qty: l.qty,
        price: l.priceBase,
        priceBase: l.priceBase,
      }))}
      subtotal={subtotalBase}
      formatMoney={fmt}
      onRemoveItem={(id) => dispatch(removeItem(id))}
      onViewProduct={onViewProduct}
      onCheckout={onCheckout}
      onViewCart={onViewCart}
    />
  );
}
