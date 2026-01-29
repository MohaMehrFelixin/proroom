const ChatIndexPage = () => {
  return (
    <div className="hidden h-full flex-col items-center justify-center bg-tg-bg-dark md:flex">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-tg-bg-secondary">
          <svg
            className="h-10 w-10 text-tg-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-tg-text">
          Select a chat to start messaging
        </h2>
        <p className="mt-2 text-sm text-tg-text-secondary">
          End-to-end encrypted
        </p>
      </div>
    </div>
  );
};

export default ChatIndexPage;
