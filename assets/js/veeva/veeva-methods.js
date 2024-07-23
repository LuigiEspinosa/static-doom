/**
 * Navigates to the next slide within the Veeva CLM presentation based on the display order in the CRM.
 */
const goToNextSlide = () => {
    console.log('Navigating to the next slide...');
    com.veeva.clm.nextSlide();
};

/**
 * Navigates to the previous slide within the Veeva CLM presentation based on the display order in the CRM.
 */
const goToPreviousSlide = () => {
    console.log('Navigating to the previous slide...');
    com.veeva.clm.prevSlide();
};

/**
 * Navigates to the specified slide in Veeva CLM.
 *
 * If the presentation param is provided, navigates to the specified slide in that presentation, otherwise navigates to the specified slide within the same presentation.
 *
 * @param {string} slide The name of the Astro page (aka the slide) to navigate to (e.g. '01-home').
 * @param {string} [presentation] The value of the field of the desired presentation.
 */
const goToSlide = (slide, presentation) => {
    const appendedSlide = slide.endsWith('.zip') ? slide : `${slide}.zip`;

    if (presentation) {
        console.log(`Navigating to ${appendedSlide} in ${presentation}`);
        com.veeva.clm.gotoSlide(`${appendedSlide}`, presentation);
        return;
    }

    console.log(`Navigating to ${appendedSlide}`);
    com.veeva.clm.gotoSlide(`${appendedSlide}`);
};

/**
 * Goes to the home slide of a presentation using its Vault Doucment ID
 * Or goes to a different slide on that presentation if a custom 'mediaFileName' is passed as a parameter.
 *
 * @param {string} vaultDocumentID the Vault Document ID assoiated with a Presentation.
 * @param {string} mediaFileName the name of the zip file associated with a Key Message.
 *
 */

const goToDSP = async (vaultDocumentID, mediaFileName = '') => {
    try {
        const firstQueryResponse = await queryRecord(
            'Clm_Presentation_vod__c',
            ['Presentation_Id_vod__c', 'Id'],
            `WHERE Vault_Doc_Id_vod__c = ${vaultDocumentID}`,
            ['Vault_Doc_Id_vod__c, ASC'],
            '1'
        );

        const presentationSalesforceID = firstQueryResponse[0].Id;
        const presentationID = firstQueryResponse[0].Presentation_Id_vod__c;

        if (mediaFileName) {
            com.veeva.clm.gotoSlide(mediaFileName, presentationID);
        } else {
            const secondQueryResponse = await queryRecord(
                'Clm_Presentation_Slide_vod__c',
                ['Key_Message_vod__c'],
                `WHERE Clm_Presentation_vod__c = '${presentationSalesforceID}' AND Display_Order_vod__c = 1`,
                ['Key_Message_vod__c, ASC'],
                '1'
            );

            const keyMessageSalesforceID = secondQueryResponse[0].Key_Message_vod__c;

            com.veeva.clm.getDataForObject(
                'Key_Message_vod__c',
                keyMessageSalesforceID,
                'Media_File_Name_vod__c',
                (thirdQueryResponse) => {
                    const keyMessageMediaFilename = thirdQueryResponse.Key_Message_vod__c.Media_File_Name_vod__c;

                    com.veeva.clm.gotoSlide(keyMessageMediaFilename, presentationID);
                }
            );
        }
    } catch (error) {
        console.error(error);
    }
};

/**
 * Track the specified data slide in salesforce.
 *
 * Those 2 params are for record tracking info in the Report: CLM - Calls w/ Call Clickstream
 * @param {string} clickStream: data obtained from routes.ts fro track evey slide info.
 * @param {string} saveData log.
 */
const trackAction = (trackingObject) => {
    const saveData = (objCreated) => console.log('Creating record: ', objCreated);
    const clickStream = {
        Track_Element_Id_vod__c: trackingObject.id,
        Track_Element_Type_vod__c: trackingObject.type,
        Track_Element_Description_vod__c: trackingObject.description,
    };

    try {
        saveData(clickStream);
        com.veeva.clm.createRecord('Call_Clickstream_vod__c', clickStream, saveData);
    } catch (error) {
        console.error(error);
    }
};

/**
 * Get CLM ID from current slide.
 * How to use:
 * - Create a new state.
 * - Create an asynchronous function and set the state with the 
 *   getCLMSlideId() response.
 * Example:
 *     const [clmId, setClmId] = useState<string>();
 *     const getId = async () => {
            const id = await getCLMSlideId();
            setClmId(id);
        };
        useEffect(() => {
            getId();
        }, [dependency]);
 */
const getCLMSlideId = () => {
    try {
        return new Promise((resolve, reject) => {
            com.veeva.clm.getDataForCurrentObject('KeyMessage', 'CLM_ID_vod__c', (id) => {
                if (id) {
                    resolve(id.KeyMessage.CLM_ID_vod__c);
                } else {
                    reject(new Error('Failed to get CLM ID'));
                }
            });
        });
    } catch (error) {
        console.error(error);
    }
};

/**
 * Check if zoom is disabled for the current slide.
 * How to use:
 * - Create an asynchronous function and use the boolean value returned by isZoomDisabled() as needed.
 * Example:
 *      const getSlideDisabledActions = async () => {
 *          const disabledZoom = await isZoomDisabled();
 *          const metatag = document.getElementById('meta-responsive');
 *          if (disabledZoom) {
 *              metatag?.setAttribute('content', 'width=device-width, user-scalable=no, shrink-to-fit=no');
 *          }
 *     };
 *
 *      useEffect(() => {
 *          if (!isDev) {
 *              getSlideDisabledActions();
 *          }
 *      }, []);
 */
const isZoomDisabled = () => {
    try {
        return new Promise((resolve, reject) => {
            com.veeva.clm.getDataForCurrentObject('KeyMessage', 'Disable_Actions_vod__c', (response) => {
                if (response) {
                    const zoomDisabled = response.KeyMessage.Disable_Actions_vod__c.includes('Zoom_vod');
                    resolve(zoomDisabled);
                } else {
                    reject(new Error('Failed to get disabled actions'));
                }
            });
        });
    } catch (error) {
        console.error(error);
    }
};

/**
 * Gets the current account.
 *
 */

const getDataForCurrentAccount = async () => {
    try {
        return await new Promise((resolve, reject) => {
            com.veeva.clm.getDataForCurrentObject('Account', 'Id', (response) => {
                console.log('Getting data for current account...', response);
                if (response.success) {
                    resolve(response.Account);
                } else {
                    reject(new Error(response.message || 'Error getting data'));
                }
            });
        });
    } catch (error) {
        console.log(error);
    }
};

/**
 * Helper function to get data from CRM.
 *
 * @param {string} object The name of the object to query.
 * @param {string[]} fields The fields to return in the query.
 * @param {string} where The where clause for the query.
 * @param {string[]} sort The sort clause for the query.
 * @param {string} limit The limit clause for the query.
 */

const queryRecord = async (object, fields, where, sort, limit) => {
    let data = null;

    try {
        await new Promise((resolve) => {
            com.veeva.clm.queryRecord(object, fields, where, sort, limit, (response) => {
                if (response.success) {
                    data = response[object];
                    resolve();
                } else {
                    throw new Error(response?.message || 'Error getting data');
                }
            });
        });
    } catch (error) {
        console.log(error);
    }

    return data;
};

/**
 * Get the current account.
 */

const getAccount = async () => {
    let account = null;

    const objectName = 'Account';
    const sortClause = ['Name, ASC'];
    const limit = '1';

    const fields = [
        'Id',
        'Name',
        'FirstName',
        'KeyMessages__c',
        'LastName',
        'PersonEmail',
        'Fax',
        'Pfizer_Customer_pfi__c',
    ];

    try {
        const currentAccount = await getDataForCurrentAccount();
        const whereClause = `WHERE Id = '${currentAccount?.Id}'`;
        account = await queryRecord(objectName, fields, whereClause, sortClause, limit);
    } catch (error) {
        console.log(error);
    }
    return account[0];
};

/**
 * Get the brand info based on HCP and brand IDs.
 * @param {string} productName The name of the product.
 * @param {string} productIds The product ids.
 * @param {string} customerId The customer id.
 */

const getBrandInfoData = async (brandName, product, customerId) => {
    const objectName = 'Account_Key_Message__c';
    const fields = ['Id', 'KeyMessageCodes__c', 'KeyMessage__c'];
    const whereClause = `WHERE External_Id__c = '${customerId}:${product[0].External_ID_vod__c}'`;
    const sortClause = ['Name, ASC'];
    const limit = '1';

    try {
        const queryResponse = await queryRecord(objectName, fields, whereClause, sortClause, limit);
        const brandInfo = {
            success: true,
            product: String(brandName),
            productId: String(product[0].Id),
            recordId: String(queryResponse[0].Id),
            keyMessages: String(queryResponse[0].KeyMessage__c),
            keyMessageCodes: String(queryResponse[0].KeyMessageCodes__c),
            message: String('Success'),
        };
        return brandInfo;
    } catch (error) {
        const brandInfo = {
            success: false,
            product: '',
            productId: '',
            recordId: '',
            keyMessages: '',
            keyMessageCodes: '',
            message: error?.message.toString() || 'Error getting data',
        };

        return brandInfo;
    }
};

/**
 * Get the brand info based on HCP and brand IDs.
 * @param {string} productName The name of the product.
 * @param {string} productIds The product ids.
 * @param {string} customerId The customer id.
 * @throws {Error} If there is an error getting the brand info.
 */

const getBrand = async (productName, productIds, customerId) => {
    let brandInfo = null;

    try {
        if (!productIds) {
            console.error('Product id is missing');
        }

        const objectName = 'Product_vod__c';
        const fields = ['Id', 'External_ID_vod__c'];
        const whereClause = `WHERE Name = '${productName}'`;
        const sortClause = ['Name, ASC'];
        const limit = '1';

        const queryResponse = await queryRecord(objectName, fields, whereClause, sortClause, limit);
        brandInfo = await getBrandInfoData(productName, queryResponse, customerId);
    } catch (error) {
        brandInfo = {
            success: false,
            product: '',
            productId: '',
            recordId: '',
            keyMessages: '',
            keyMessageCodes: '',
            message: error?.message.toString() || 'Error getting data',
        };
    }

    return brandInfo;
};

/**
 * Get the key message data based on the external id or External Id.
 * @param {string} id The external id.
 * @throws {Error} If there is an error getting the key message data.
 */

const getKeyMessageData = async (id) => {
    if (!id) {
        console.log('[Error]: External_Id__c is missing');
        return {
            success: false,
            message: 'External_Id__c is missing',
        };
    }

    const objectName = 'Account_Key_Message_Fact__c';
    const fields = ['Id', 'Type__c', 'Value__c', 'External_Id__c'];
    const whereClause = `WHERE Id = '${id}' or External_Id__c = '${id}'`;
    const sortClause = ['Type__c, ASC'];
    const limit = '1';

    try {
        const queryResponse = await queryRecord(objectName, fields, whereClause, sortClause, limit);
        return {
            success: true,
            message: 'Success',
            ...queryResponse[0],
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: error?.message || 'Error getting data',
        };
    }
};

export {
    goToNextSlide,
    goToPreviousSlide,
    goToSlide,
    trackAction,
    getCLMSlideId,
    isZoomDisabled,
    getAccount,
    getBrand,
    getKeyMessageData,
    goToDSP,
};
