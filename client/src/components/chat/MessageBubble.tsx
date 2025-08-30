interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMessageContent = () => {
    if (message.ad?.type === 'delete') {
      return <i className="text-muted-foreground">Message removed</i>;
    }
    return message.plaintext || '[Encrypted message]';
  };

  return (
    <div className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`} data-testid={`message-${message.msg_id || message.id}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isOwn ? 'bg-primary' : 'bg-secondary'
      }`}>
        <i className={`fas fa-user text-xs ${
          isOwn ? 'text-primary-foreground' : 'text-secondary-foreground'
        }`}></i>
      </div>
      
      <div className={`flex-1 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="font-medium text-sm">
            {isOwn ? 'You' : (message.sender_handle || 'User')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.ts || message.timestamp)}
          </span>
          <i className="fas fa-lock text-accent text-xs" title="End-to-end encrypted"></i>
        </div>
        
        <div className={`rounded-lg p-3 message-bubble max-w-[80%] ${
          isOwn 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-secondary text-secondary-foreground rounded-tl-sm'
        } ${message.ad?.type === 'delete' ? 'opacity-60' : ''}`}>
          <p className="text-sm" data-testid={`text-message-content-${message.msg_id || message.id}`}>
            {getMessageContent()}
          </p>
        </div>
        
        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
          isOwn ? 'flex-row-reverse' : ''
        }`}>
          {message.sth_index && (
            <span data-testid={`text-sth-${message.msg_id || message.id}`}>
              STH: #{message.sth_index}
            </span>
          )}
          <i className="fas fa-check-double text-accent"></i>
        </div>
      </div>
    </div>
  );
}
