import MetadataItem = Manifold.IMetadataItem;
import MetadataGroup = Manifold.MetadataGroup;

type csvvalue = string | null;

namespace IIIFComponents {
    export class MetadataComponent extends _Components.BaseComponent implements IMetadataComponent{

        public options: _Components.IBaseComponentOptions;

        private _$copyTextTemplate: JQuery;
        private _$metadataGroups: JQuery;
        private _$metadataGroupTemplate: JQuery;
        private _$metadataItemTemplate: JQuery;
        private _$metadataItemURIValueTemplate: JQuery;
        private _$metadataItemValueTemplate: JQuery;
        private _$noData: JQuery;
        private _data: IMetadataComponentData = this.data();
        private _metadataGroups: MetadataGroup[];

        constructor(options: _Components.IBaseComponentOptions) {
            super(options);
            
            this._init();
            this._resize();
        }

        protected _init(): boolean {
            const success: boolean = super._init();

            if (!success){
                console.error("Component failed to initialise");
            }

            this._$metadataGroupTemplate =   $('<div class="group">\
                                                   <div class="header"></div>\
                                                   <div class="items"></div>\
                                               </div>');

            this._$metadataItemTemplate =   $('<div class="item">\
                                                   <div class="label"></div>\
                                                   <div class="values"></div>\
                                               </div>');
            
            this._$metadataItemValueTemplate = $('<div class="value"></div>');

            this._$metadataItemURIValueTemplate = $('<a class="value" href="" target="_blank"></a>');

            this._$copyTextTemplate =       $('<div class="copyText" alt="' + this._data.content.copyToClipboard  + '" title="' + this._data.content.copyToClipboard + '">\
                                                   <div class="copiedText">' + this._data.content.copiedToClipboard + ' </div>\
                                               </div>');

            this._$metadataGroups = $('<div class="groups"></div>');
            this._$element.append(this._$metadataGroups);

            this._$noData = $('<div class="noData">' + this._data.content.noData + '</div>');
            this._$element.append(this._$noData);

            return success;
        }
        
        public data(): IMetadataComponentData {
            return <IMetadataComponentData>{
                aggregateValues: "",
                canvases: null,
                canvasDisplayOrder: "",
                metadataGroupOrder: "",
                canvasExclude: "",
                canvasLabels: "",
                content: <IMetadataComponentContent>{
                    attribution: "Attribution",
                    canvasHeader: "About the canvas",
                    copiedToClipboard: "Copied to clipboard",
                    copyToClipboard: "Copy to clipboard",
                    description: "Description",
                    imageHeader: "About the image",
                    less: "less",
                    license: "License",
                    logo: "Logo",
                    manifestHeader: "About the item",
                    more: "more",
                    noData: "No data to display",
                    rangeHeader: "About the range",
                    sequenceHeader: "About the sequence"
                },
                copiedMessageDuration: 2000,
                copyToClipboardEnabled: false,
                helper: null,
                licenseFormatter: null,
                limit: 4,
                limitType: MetadataComponentOptions.LimitType.LINES,
                manifestDisplayOrder: "",
                manifestExclude: "",
                range: null,
                rtlLanguageCodes: "ar, ara, dv, div, he, heb, ur, urd",
                sanitizer: function(html) { return html },
                showAllLanguages: false
            }
        }

        private _getManifestGroup(): MetadataGroup {
            return this._metadataGroups.en().where(x => x.resource.isManifest()).first();
        }

        private _getCanvasGroups(): MetadataGroup[] {
            return this._metadataGroups.en().where(x => x.resource.isCanvas()).toArray();
        }

        public set(data: IMetadataComponentData): void {

            $.extend(this._data, data);

            if (!this._data || !this._data.helper) {
                return;
            }

            const options: Manifold.MetadataOptions = <Manifold.MetadataOptions>{
                canvases: this._data.canvases,
                licenseFormatter: this._data.licenseFormatter,
                range: this._data.range
            }

            this._metadataGroups = this._data.helper.getMetadata(options);

            if (this._data.manifestDisplayOrder) {
                const manifestGroup: MetadataGroup = this._getManifestGroup();
                manifestGroup.items = this._sortItems(manifestGroup.items, this._readCSV(this._data.manifestDisplayOrder));
            }

            if (this._data.canvasDisplayOrder) {
                const canvasGroups: MetadataGroup[] = this._getCanvasGroups();

                canvasGroups.forEach((canvasGroup: MetadataGroup, index: number) => {
                    canvasGroup.items = this._sortItems(canvasGroup.items, this._readCSV(this._data.canvasDisplayOrder));
                });
            }

            if (this._data.metadataGroupOrder) {
                this._metadataGroups = this._sortGroups(this._metadataGroups, this._readCSV(this._data.metadataGroupOrder));
            }

            if (this._data.canvasLabels) {
                this._label(this._getCanvasGroups(), this._readCSV(this._data.canvasLabels, false));
            }

            if (this._data.manifestExclude) {
                const manifestGroup: MetadataGroup = this._getManifestGroup();
                manifestGroup.items = this._exclude(manifestGroup.items, this._readCSV(this._data.manifestExclude));
            }

            if (this._data.canvasExclude) {
                const canvasGroups: MetadataGroup[] = this._getCanvasGroups();

                canvasGroups.forEach((canvasGroup: MetadataGroup, index: number) => {
                    canvasGroup.items = this._exclude(canvasGroup.items, this._readCSV(this._data.canvasExclude));
                });
            }

            this._render();
        }

        private _sortItems(items: MetadataItem[], displayOrder: csvvalue[]): MetadataItem[] {

            let sorted: MetadataItem[] = [];
            let unsorted: MetadataItem[] = items.slice(0);

            displayOrder.forEach((item: string, index: number) => {
                const match: MetadataItem = unsorted.en().where((x => this._normalise(x.getLabel()) === item)).first();
                if (match){
                    sorted.push(match);

                    const index: number = unsorted.indexOf(match);
                    if (index > -1) {
                        unsorted.splice(index, 1);
                    }
                }
            });

            // add remaining items that were not in the displayOrder.
            unsorted.forEach((item: MetadataItem, index: number) => {
                sorted.push(item);
            });

            return sorted;
        }

        private _sortGroups(groups: MetadataGroup[], metadataGroupOrder: csvvalue[]): MetadataGroup[] {

            let sorted: MetadataGroup[] = [];
            let unsorted: MetadataGroup[] = groups.slice(0);

            metadataGroupOrder.forEach((group: string, index: number) => {
                const match: MetadataGroup = unsorted.en().where(x => x.resource.constructor.name.toLowerCase() == group).first();
                if (match) {
                    sorted.push(match);
                    const index: number = unsorted.indexOf(match);
                    if (index > -1) {
                        unsorted.splice(index, 1);
                    }
                }
            });
            return sorted;
        }

        private _label(groups: MetadataGroup[], labels: csvvalue[]): void {

            groups.forEach((group: MetadataGroup, index: number) => {
                group.label = <string>labels[index];
            });
        }

        private _exclude(items: MetadataItem[], excludeConfig: csvvalue[]): MetadataItem[] {

            excludeConfig.forEach((item: string, index: number) => {
                const match: MetadataItem = items.en().where((x => this._normalise(x.getLabel()) === item)).first();
                if (match) {
                    const index: number = items.indexOf(match);
                    if (index > -1) {
                        items.splice(index, 1);
                    }
                }
            });
            
            return items;
        }
        
        // private _flatten(items: MetadataItem[]): MetadataItem[] {
        //     // flatten metadata into array.
        //     var flattened: MetadataItem[] = [];

        //     items.forEach(item: any, index: number) => {
        //         if (Array.isArray(item.value)){
        //             flattened = flattened.concat(<MetadataItem[]>item.value);
        //         } else {
        //             flattened.push(item);
        //         }
        //     });

        //     return flattened;
        // }

        // merge any duplicate items into canvas metadata
        // todo: needs to be more generic taking a single concatenated array
        // private _aggregate(manifestMetadata: any[], canvasMetadata: any[]) {

        //     if (this._aggregateValues.length) {

        //         canvasMetadata.forEach((canvasItem: any, index: number) => {

        //             this._aggregateValues.forEach((value: string, index: number) => {

        //                 value = this._normalise(value);

        //                 if (this._normalise(canvasItem.label) === value) {
        //                     var manifestItem = manifestMetadata.en().where(x => this._normalise(x.label) === value).first();

        //                     if (manifestItem) {
        //                         canvasItem.value = manifestItem.value + canvasItem.value;
        //                         manifestMetadata.remove(manifestItem);
        //                     }
        //                 }  

        //             });

        //         });
        //     }
        // }

        private _normalise(value: string | null): string | null {
            if (value) {
                return value.toLowerCase().replace(/ /g, "");
            }
            
            return null;
        }

        private _render(): void {

            if (!this._metadataGroups.length) {
                this._$noData.show();
                return;
            }

            this._$noData.hide();

            this._$metadataGroups.empty();

            this._metadataGroups.forEach((metadataGroup: MetadataGroup, index: number) => {
                const $metadataGroup: JQuery = this._buildMetadataGroup(metadataGroup);
                this._$metadataGroups.append($metadataGroup);

                if (this._data.limitType === MetadataComponentOptions.LimitType.LINES) {
                    $metadataGroup.find('.value').toggleExpandTextByLines(this._data.limit, this._data.content.less, this._data.content.more, () => {});
                } else if (this._data.limitType === MetadataComponentOptions.LimitType.CHARS) {
                    $metadataGroup.find('.value').ellipsisHtmlFixed(this._data.limit, () => {});
                }
            });
        }

        private _buildMetadataGroup(metadataGroup: MetadataGroup): JQuery {
            const $metadataGroup: JQuery = this._$metadataGroupTemplate.clone();
            const $header: JQuery = $metadataGroup.find('>.header');

            // add group header
            if (metadataGroup.resource.isManifest() && this._data.content.manifestHeader) {
                $header.html(this._sanitize(this._data.content.manifestHeader));
            } else if (metadataGroup.resource.isSequence() && this._data.content.sequenceHeader) {
                $header.html(this._sanitize(this._data.content.sequenceHeader));
            } else if (metadataGroup.resource.isRange() && this._data.content.rangeHeader) {
                $header.html(this._sanitize(this._data.content.rangeHeader));
            } else if (metadataGroup.resource.isCanvas() && (metadataGroup.label || this._data.content.canvasHeader)) {
                const header: string = metadataGroup.label || this._data.content.canvasHeader;
                $header.html(this._sanitize(header));
            } else if (metadataGroup.resource.isAnnotation() && this._data.content.imageHeader) {
                $header.html(this._sanitize(this._data.content.imageHeader));
            }

            if (!$header.text()) {
                $header.hide();
            }

            const $items: JQuery = $metadataGroup.find('.items');

            for (let i = 0; i < metadataGroup.items.length; i++) {
                const item: MetadataItem = metadataGroup.items[i];
                const $metadataItem: JQuery = this._buildMetadataItem(item);
                $items.append($metadataItem);
            }

            return $metadataGroup;
        }

        private _buildMetadataItem(item: MetadataItem): JQuery {
            const $metadataItem: JQuery = this._$metadataItemTemplate.clone();
            const $label: JQuery = $metadataItem.find('.label');
            const $values: JQuery = $metadataItem.find('.values');

            const originalLabel: string | null = item.getLabel();
            let label: string | null = originalLabel;
            var urlPattern = new RegExp("/\w+:(\/?\/?)[^\s]+/gm", "i");

            if (label && item.isRootLevel) {
                switch (label.toLowerCase()) {
                    case "attribution":
                        label = this._data.content.attribution;
                        break;
                    case "description":
                        label = this._data.content.description;
                        break;
                    case "license":
                        label = this._data.content.license;
                        break;
                    case "logo":
                        label = this._data.content.logo;
                        break;
                }
            }

            label = this._sanitize(<string>label);
            $label.html(<string>label);

            // rtl?
            this._addReadingDirection($label, this._getItemLocale(item));

            $metadataItem.addClass(Utils.Strings.toCssClass(<string>label));

            let $value: JQuery;

            // if the value is a URI
            if (originalLabel && originalLabel.toLowerCase() === "license" && (urlPattern.exec(item.value[0].value) != null)) {
                $value = this._buildMetadataItemURIValue(item.value[0].value);
                $values.append($value);
            } else {

                if (this._data.showAllLanguages && item.value && item.value.length > 1) {
                    // display all values in each locale
                    for (let i = 0; i < item.value.length; i++) {
                        const translation: Manifesto.Translation = item.value[i];
                        $value = this._buildMetadataItemValue(translation.value, translation.locale);
                        $values.append($value);
                    }
                } else {

                    const itemLocale: string = this._getItemLocale(item);
                    let valueFound: boolean = false;

                    // display all values in the item's locale
                    for (let i = 0; i < item.value.length; i++) {
                        const translation: Manifesto.Translation = item.value[i];

                        if (itemLocale === translation.locale) {
                            valueFound = true;
                            $value = this._buildMetadataItemValue(translation.value, translation.locale);
                            $values.append($value);
                        }
                    }

                    // if no values were found in the current locale, default to the first.
                    if (!valueFound) {
                        const translation: Manifesto.Translation = item.value[0];

                        if (translation) {
                            $value = this._buildMetadataItemValue(translation.value, translation.locale);
                            $values.append($value);
                        }

                    }
                }
            }


            if (this._data.copyToClipboardEnabled && Utils.Clipboard.supportsCopy() && $label.text()){
                this._addCopyButton($metadataItem, $label, $values);
            }

            return $metadataItem;
        }

        private _getItemLocale(item: MetadataItem): string {
            if (!this._data || !this._data.helper) {
                return ''; // todo: remove
            }
            // the item's label locale takes precedence
            return (item.label.length && item.label[0].locale) ? item.label[0].locale : item.defaultLocale || this._data.helper.options.locale;
        }

        private _buildMetadataItemValue(value: string, locale: string): JQuery {
            value = this._sanitize(value);
            value = value.replace('\n', '<br>'); // replace \n with <br>
            const $value: JQuery = this._$metadataItemValueTemplate.clone();
            $value.html(value);
            $value.targetBlank();

            // rtl?
            if (locale) {
                this._addReadingDirection($value, locale);
            }

            return $value;
        }

        private _buildMetadataItemURIValue(value: string): JQuery {
            value = this._sanitize(value);
            const $value: JQuery = this._$metadataItemURIValueTemplate.clone();
            $value.prop('href', value);
            $value.text(value);
            return $value;
        }

        private _addReadingDirection($elem: JQuery, locale: string) {
            locale = Manifesto.Utils.getInexactLocale(locale);
            const rtlLanguages: csvvalue[] = this._readCSV(this._data.rtlLanguageCodes);
            const match: boolean = rtlLanguages.en().where(x => x === locale).toArray().length > 0;

            if (match) {
                $elem.prop('dir', 'rtl');
                $elem.addClass('rtl');
            }
        }

        private _addCopyButton($elem: JQuery, $header: JQuery, $values: JQuery): void {
            const $copyBtn = this._$copyTextTemplate.clone();
            const $copiedText = $copyBtn.children();
            $header.append($copyBtn);

            if (Utils.Device.isTouch()) {
                $copyBtn.show();
            } else {
                $elem.on('mouseenter', function() {
                    $copyBtn.show();
                });
                $elem.on('mouseleave', function() {
                    $copyBtn.hide();
                });
                $copyBtn.on('mouseleave', function() {
                    $copiedText.hide();
                });
            }

            const that = this;

            const originalValue = $values.text();

            $copyBtn.on('click', function(e) {
                that._copyItemValues($copyBtn, originalValue);
            });
        }

        private _copyItemValues($copyButton: JQuery, originalValue: string) {
            Utils.Clipboard.copy(originalValue);

            const $copiedText = $copyButton.find('.copiedText');
            $copiedText.show();

            setTimeout(() => {
                $copiedText.hide();
            }, this._data.copiedMessageDuration);
        }
        
        private _readCSV(config: string, normalise: boolean = true): csvvalue[] {
            let csv: csvvalue[] = [];
            
            if (config) {

                csv = config.split(',');

                if (normalise) {
                    for (let i = 0; i < csv.length; i++) {
                        csv[i] = this._normalise(csv[i]);
                    }
                }

            }

            return csv;
        }
        
        private _sanitize(html: string) {
            return this._data.sanitizer(html);
        }

        protected _resize(): void {
            
        }
    }
}

namespace IIIFComponents.MetadataComponent {
    export class Events {
        
    }
}

(function(g: any) {
    if (!g.IIIFComponents){
        g.IIIFComponents = IIIFComponents;
    } else {
        g.IIIFComponents.MetadataComponent = IIIFComponents.MetadataComponent;
        g.IIIFComponents.MetadataComponentOptions = IIIFComponents.MetadataComponentOptions;
    }
})(global);
