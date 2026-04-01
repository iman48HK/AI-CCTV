<template>
  <span class="avatar-ring">
    <svg class="avatar" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2">
      <circle cx="20" cy="20" r="19" />
      <circle cx="20" cy="15" r="5" />
      <path d="M8 35c0-7 5.4-12 12-12s12 5 12 12" />
    </svg>
  </span>
</template>

<style scoped>
.avatar-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.25);
}

.avatar {
  width: 56px;
  height: 56px;
  color: #fff;
}
</style>
