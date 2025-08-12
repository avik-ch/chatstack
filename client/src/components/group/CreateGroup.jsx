import React, { useState } from 'react';
import { groupsAPI } from '../../services/api';

const CreateGroup = ({ friends, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFriendToggle = (friendId) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create the group
      const response = await groupsAPI.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || null
      });

      const newGroup = response.data.group;

      // Add selected friends to the group
      const addMemberPromises = Array.from(selectedFriends).map(friendId =>
        groupsAPI.addMember(newGroup.id, friendId)
      );

      await Promise.all(addMemberPromises);

      if (onGroupCreated) {
        onGroupCreated();
      }
      
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content create-group-modal">
        <div className="modal-header">
          <h3>Create New Group</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="create-group-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="groupName">Group Name *</label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              required
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupDescription">Description</label>
            <textarea
              id="groupDescription"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What's this group about? (optional)"
              rows="3"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>Add Friends to Group</label>
            <div className="friends-selection">
              {friends.length === 0 ? (
                <div className="no-friends">
                  No friends to add. You can add members later.
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`friend-option ${selectedFriends.has(friend.id) ? 'selected' : ''}`}
                    onClick={() => handleFriendToggle(friend.id)}
                  >
                    <div className="friend-checkbox">
                      {selectedFriends.has(friend.id) && '✓'}
                    </div>
                    <div className="friend-avatar">
                      {friend.firstName ? friend.firstName[0].toUpperCase() : friend.username[0].toUpperCase()}
                    </div>
                    <div className="friend-info">
                      <div className="friend-name">
                        {friend.firstName && friend.lastName ? `${friend.firstName} ${friend.lastName}` : friend.username}
                      </div>
                      <div className="friend-username">@{friend.username}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {selectedFriends.size > 0 && (
              <div className="selected-count">
                {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading || !groupName.trim()} className="create-btn">
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
