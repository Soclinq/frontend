export default function ChatPanel({ groupId }: Props) {
    // keep all your current states here for now
  
    return (
      <div className={styles.chat}>
        <ChatHeader
          selectionMode={selectionMode}
          selectedCount={selectedCount}
          selectedMessages={selectedMessages}
          selectableMessageIds={selectableMessageIds}
          onExitSelection={clearSelection}
          onSelectAll={selectAllMessages}
          onUnselectAll={unselectAllMessages}
          onForward={() => setForwardSheet({ open: true, messages: selectedMessages })}
          onShare={async () => {
            await shareExternallyBulk(selectedMessages);
            clearSelection();
          }}
          onDelete={deleteSelectedForMe}
        />
  
        <ChatMessages
          messages={messages}
          loading={loading}
          error={error}
          selectionMode={selectionMode}
          isSelected={isSelected}
          onMessageClick={onMessageClick}
          toggleSelectMessage={toggleSelectMessage}
          hoverMsgId={hoverMsgId}
          setHoverMsgId={setHoverMsgId}
          startReply={startReply}
          scrollToMessage={scrollToMessage}
          highlightMsgId={highlightMsgId}
          loadOlder={loadOlder}
          reactToMessage={reactToMessage}
          setReactionPicker={setReactionPicker}
        />
<ChatHeader />

<ChatMessages />

<ChatTyping />

<ReplyBar />

<ChatFooter /> ✅ you already have this

<ContextMenu />

<ReactionQuickRow />

<EmojiMartPopup />

<InfoModal />

<DeleteSheet />

<ForwardSheet />

<CameraModal />
ChatContextMenu
<ChatContextMenu
  menu={{
    open: menu.open,
    x: menu.x,
    y: menu.y,
    message: menu.message
      ? {
          id: menu.message.id,
          text: menu.message.text,
          isMine: menu.message.isMine,
          deletedAt: menu.message.deletedAt,
          messageType: menu.message.messageType,
        }
      : null,
  }}
  notify={notify} // ✅ passed from parent

  canEdit={(m) => canEdit(m as any)} // if you want strict typing later

  onClose={closeMenu}
  onReply={(m) => setReplyTo(menu.message as any)}
  onInfo={(m) => setInfoModal({ open: true, messageId: m.id })}
  onCopy={(m) => copyMessage(menu.message as any)}
  onForward={(m) =>
    setForwardSheet({ open: true, messages: [menu.message as any] })
  }
  onReact={(pos, m) =>
    setReactionPicker({
      open: true,
      message: menu.message as any,
      x: pos.x,
      y: Math.max(12, pos.y - 70),
    })
  }
  onEdit={(m) => {
    setInput(menu.message?.text || "");
    setEditingMessageId(m.id);
  }}
  onDelete={(m) => {
    setDeleteSheet({ open: true, message: menu.message as any });
  }}
/>

<ChatReactionQuickRow
  picker={{
    open: reactionPicker.open,
    message: reactionPicker.message
      ? { id: reactionPicker.message.id, myReaction: reactionPicker.message.myReaction }
      : null,
    x: reactionPicker.x,
    y: reactionPicker.y,
  }}
  emojis={recentEmojis}
  onReact={(msg, emoji) => {
    // ✅ use your existing function (but needs real message object)
    if (!reactionPicker.message) return;
    reactToMessage(reactionPicker.message, emoji);
  }}
  onOpenEmojiMart={({ message, x, y }) => {
    if (!reactionPicker.message) return;
    setEmojiMart({
      open: true,
      message: reactionPicker.message,
      x,
      y,
    });
  }}
  onClose={() =>
    setReactionPicker({ open: false, message: null, x: 0, y: 0 })
  }
/>

<ChatEmojiMartPopup
  mart={{
    open: emojiMart.open,
    message: emojiMart.message ? { id: emojiMart.message.id } : null,
    x: emojiMart.x,
    y: emojiMart.y,
  }}
  onClose={() =>
    setEmojiMart({ open: false, message: null, x: 0, y: 0 })
  }
>
  <Picker
    data={data}
    theme="light" // ✅ light theme for now
    previewPosition="none"
    onEmojiSelect={(emoji: any) => {
      const chosen = emoji?.native;
      if (!chosen || !emojiMart.message) return;

      reactToMessage(emojiMart.message, chosen);

      setEmojiMart({ open: false, message: null, x: 0, y: 0 });
    }}
  />
</ChatEmojiMartPopup>



import ReplyBar from "./ReplyBar";

{replyTo && (
  <ReplyBar
    replyTo={replyTo}
    onJump={(id) => scrollToMessage(id)}
    onCancel={() => {
      setReplyTo(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }}
  />
)}

<ChatDeleteSheet
  sheet={{
    open: deleteSheet.open,
    message: deleteSheet.message
      ? {
          id: deleteSheet.message.id,
          text: deleteSheet.message.text,
          isMine: deleteSheet.message.isMine,
          deletedAt: deleteSheet.message.deletedAt,
        }
      : null,
  }}
  notify={notify}
  onClose={() => setDeleteSheet({ open: false, message: null })}
  onDeleteForMe={async (m) => {
    const msg = deleteSheet.message!;
    // ✅ keep your existing logic
    closeMenu();

    // optimistic local remove
    setMessages((prev) => prev.filter((x) => x.id !== msg.id));

    await authFetch(`/communities/chat/messages/${msg.id}/delete-for-me/`, {
      method: "POST",
      credentials: "include",
    });

    markDeletedForMe(msg.id);
    setMessages((prev) => prev.filter((x) => x.id !== msg.id));
  }}
  canDeleteForEveryone={(m) => canDeleteForEveryone(deleteSheet.message as any)}
  onDeleteForEveryone={async (m) => {
    const msg = deleteSheet.message!;
    closeMenu();

    // optimistic soft delete
    setMessages((prev) =>
      prev.map((x) =>
        x.id === msg.id
          ? {
              ...x,
              deletedAt: new Date().toISOString(),
              text: "",
              attachments: [],
              reactions: [],
              myReaction: null,
            }
          : x
      )
    );

    await authFetch(`/communities/chat/messages/${msg.id}/`, {
      method: "DELETE",
      credentials: "include",
    });
  }}
/>

  
import ChatTypingBar from "./ChatTypingBar";

<ChatTypingBar typingUsers={typingUsers} />

  
        {replyTo && (
          <ReplyBar replyTo={replyTo} onJump={() => scrollToMessage(replyTo.id)} onCancel={() => setReplyTo(null)} />
        )}
  
        <CameraModal ... />
  
        <ChatFooter ... />
  
        <ChatOverlays
          menu={menu}
          reactionPicker={reactionPicker}
          emojiMart={emojiMart}
          infoModal={infoModal}
          deleteSheet={deleteSheet}
          forwardSheet={forwardSheet}
          // handlers...
        />
      </div>
    );
  }
  