"use client";

export default function NotificationButton() {

  return (

    <button
      aria-label="Notifications"
      className="
        relative
        w-11
        h-11
        rounded-full
        border
        border-white/10
        bg-white/5
        backdrop-blur-xl
        transition
        hover:bg-white/10
      "
    >

      <span
        className="
          absolute
          top-3
          left-3
          w-5
          h-5
          rounded-full
          border
          border-white/40
        "
      />

    </button>

  );

}
