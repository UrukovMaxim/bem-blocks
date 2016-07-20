var PersonalMessageModel = require('./m-personal-message'),
    PersonalMessagesHub = require('../../../blocks/i-user-personal-messages-hub/i-user-personal-messages-hub');

module.exports = Backbone.Collection.extend({
    model: PersonalMessageModel,
    limit: 25,
    collectionIsFetched: false,

    initialize: function() {
        this.types = ['unread', 'pinned'];

        this._initBindings();

        this.watcher = PersonalMessagesHub
            .watch(this.types)
            .on('fetched', function(data) {
                var messages = data.messages;

                if (messages.length === 0) {
                    this.collectionIsFetched = true;
                } else {
                    this.add(messages);
                }

                Backbone.trigger('updatePersonalMessageCount', data.counters);
                this.trigger('updateCount', data.counters);
            }.bind(this))
            .on('updated', function(data) {
                var messages = data.messages;

                messages.forEach(function(message) {
                    var lastMessageInCollection = this.last();
                    
                    if (!lastMessageInCollection || message.createdDate.milliseconds(0) >= lastMessageInCollection.get('createdDate').milliseconds(0)) {
                        if (message.isPinned) {
                            this.add(message, {merge: true});
                        } else {
                            this.remove(message.id);
                        }
                    }
                }.bind(this));

                Backbone.trigger('updatePersonalMessageCount', data.counters);
                this.trigger('updateCount', data.counters);
            }.bind(this));
    },
    
    _initBindings: function() {
        this.listenTo(this, {
            'change:isPinned': function(model) {this.remove(model.id)}
        })
    },
    
    comparator: function(model) {
        return -moment.utc(model.get('createdDate'));
    },

    fetch: function() {
        this.collectionIsFetched || this.watcher.next(this.limit);
    },

    removeAll: function() {
        return PersonalMessagesHub
            .readAll()
            .done(function() {
                PersonalMessagesHub.removeAll();
            }.bind(this));
    },

    readAll: function() {
        PersonalMessagesHub.readAll();
    }
});
