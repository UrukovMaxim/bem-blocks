var BemView = require('../../static/js/bomba/bem-view'),
    ChatItemView = require('../b-chat-summary-item/b-chat-summary-item'),
    SummaryItemsCollection = require('../../static/js/models/c-summary-items');
    iget = require('../i-get/i-get.client.js'),

    SummaryChatView = BemView.extend('b-chat-summary', {

        template: require('../../static/templates/b-chat-summary'),

        events: {
            'click __header': '_changedVisibilityState'
        },

        /**
         * Инициализация view блока
         * @param options {Object} - параметры view при инициализации
         */
        initialize: function(options) {
            this.buildOptions(options);
            this.render();
            this._initModelAndBindings();
            this._initBindings();
            this._summaryItemViews = {};
        },

        /**
         * Рендер view
         */
        render: function() {
            this.renderToEl(this.template, this.options);
        },

        /**
         * Иниацилизация DOM событий с view блока
         * @private
         */
        _initBindings: function() {
            this.listenToEl(this.elem('list'), 'scroll', _.debounce(function(e) {
                var $room = $(e.target),
                    scrollTop = $room.scrollTop();

                if (scrollTop < 150) {
                    if (this.collection.isFullyFetched || this.getElemMod('list', 'loading')) return;

                    this.setElemMod('list', 'loading', 'yes');
                    this.collection
                        .loadNext()
                        .then(function() {
                            this.delElemMod('list', 'loading');
                        }.bind(this));
                }
            }.bind(this), 100));
        },

        /**
         * Инитим коллекцию с необходимыми параметрами и вешаем обработчики на ее изменение
         * @private
         */
        _initModelAndBindings: function() {
            this.collection = new SummaryItemsCollection([], {
                type: this.options.type,
                task: this.options.task
            });

            this.listenTo(this.collection, {
                add: this._addedChatItemInCollection,
                remove: this._removedChatItemFromCollection
            })
        },

        /**
         * Обработчик на добавление модели в коллекцию
         * @param model {Backbone-model}
         * @private
         */
        _addedChatItemInCollection: function(model) {
            var collection = this.collection,
                index = collection.indexOf(model),
                list = this.elem('list'),
                nextItemModel = collection.at(index - 1), //todo новее по дате
                nextItemViewElem = nextItemModel && this._summaryItemViews[nextItemModel.id] && this._summaryItemViews[nextItemModel.id].$el,
                chatItemView = new ChatItemView({
                    model: model,
                    parentListElem: this.$el,
                    type: this.options.type
                }),
                chatItemElem = chatItemView.$el;

            this._updateTitle();
            this.listenTo(chatItemView, 'delete:summary-chat-item', function(options) {
                this.collection.remove({id: options.id});
            }.bind(this));

            chatItemElem.addClass(this.buildClass('item'));
            this._summaryItemViews[model.id] = chatItemView;

            if (index === 0) {
                list.append(chatItemElem);
                this.scrollTo({animate: true});
            } else if (nextItemViewElem) {
                nextItemViewElem.before(chatItemElem);
            } else {
                list.prepend(chatItemElem);
            }

            //todo После добавления в DOM ставим правильный мод для схлопывания
            chatItemView.initToggleItemMod();
        },

        /**
         * Обработчик на удаление модели из коллекции
         * @param model {Backbone-model}
         * @private
         */
        _removedChatItemFromCollection: function(model) {
            var view = this._summaryItemViews[model.get('id')],
                chatItemElem = view.$el;

            chatItemElem
                .fadeOut(350)
                .promise()
                .done(function() {
                    view.destroy();
                    delete this._summaryItemViews[model.get('id')];
                }.bind(this));

            this._updateTitle();
        },

        /**
         * Обработчик на изменение визуального состояния view
         * @private
         */
        _changedVisibilityState: function() {
            var isFullVisibilityState = this.getMod('visibility-state') === 'full',
                summaryItemId;

            if (this.getMod('empty') === 'yes') {
                return;
            }

            this.setMod('visibility-state', isFullVisibilityState ? 'short' : 'full');

            if (!isFullVisibilityState) {
                for (summaryItemId in this._summaryItemViews) {
                    this._summaryItemViews[summaryItemId].initToggleItemMod();
                }

                //todo После расхлопывания скроллим вниз
                setTimeout(function() {
                    this.scrollTo({animate: true});
                }.bind(this), 100);
            }

            this.trigger('changed:visibility-state');
        },

        /**
         * Обновляет содержимое и модификатор элемента title
         * @private
         */
        _updateTitle: function() {
            var emptyMod,
                titleText,
                isSummaryType = this.options.type === 'summary';

            if (this.collection.length > 0) {
                emptyMod = 'no';
                titleText = isSummaryType ? iget('Summary') : iget('Results') ;
            } else {
                emptyMod = 'yes';
                titleText = isSummaryType ? iget('No summary') : iget('No results');
                this.setMod('visibility-state', 'short');
                this.trigger('changed:visibility-state');
            }

            this.setMod('empty', emptyMod);
            this.elem('title').text(titleText);
        },

        /**
         * Скроллит элемент list к необходимому месту
         * @param options {Object} Параметры скролла
         * @returns {SummaryChatView} Возвращает view (используем в родительском блоке)
         */
        scrollTo: function(options) {
            options = _.defaults(options, {
                animate: false,
                to: 'end',
                offset: 0
            });

            var $room = this.elem('list'),
                endPosition = 0;

            if (options.to == 'end') {
                endPosition = $room[0].scrollHeight;
            }

            endPosition += options.offset;

            if (options.animate) {
                $room.animate({scrollTop: endPosition}, 400);
            } else {
                $room.scrollTop(endPosition);
            }

            return this;
        },

        /**
         * Дестрой блока
         */
        destroy: function() {
            this.collection.destroy();
            this._destroy();
        }
    });

module.exports = SummaryChatView;
