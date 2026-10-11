import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getConversations } from "../services/api";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import "./Messages.css";

function Messages() {
    const { user } = useAuth();
    const location = useLocation();
    const [conversations, setConversations] = useState([]);
    const [active, setActive] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [mobileChat, setMobileChat] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getConversations()
            .then((d) => {
                if (cancelled) return;
                setConversations(d.conversations);
                const wanted = location.state?.conversationId;
                if (wanted) {
                    const found = d.conversations.find((c) => c._id === wanted);
                    if (found) {
                        setActive(found);
                        setMobileChat(true);
                    }
                }
            })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [location.state]);

    const select = (convo) => {
        setActive(convo);
        setMobileChat(true);
    };

    return (
        <div className="page page-wide">
            <div className="page-header">
                <h1>Messages</h1>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className={`messenger ${mobileChat ? "show-chat" : ""}`}>
                <aside className="convo-panel">
                    <h2 className="panel-title">Conversations</h2>
                    {loading ? (
                        <p className="muted">Loading...</p>
                    ) : (
                        <ConversationList
                            conversations={conversations}
                            activeId={active?._id}
                            currentUserId={user?._id}
                            onSelect={select}
                        />
                    )}
                </aside>

                <section className="chat-panel">
                    <ChatWindow
                        conversation={active}
                        onBack={() => setMobileChat(false)}
                    />
                </section>
            </div>
        </div>
    );
}

export default Messages;
