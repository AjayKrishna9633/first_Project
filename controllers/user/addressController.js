import Address from '../../models/AddressModal.js';
import { StatusCodes } from 'http-status-codes';

const AddressPage = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 2; // Show 6 addresses per page
        const skip = (page - 1) * limit;

        const userAddresses = await Address.findOne({ userId: userId });
        const allAddresses = userAddresses ? userAddresses.address : [];
        
        // Calculate pagination
        const totalAddresses = allAddresses.length;
        const totalPages = Math.ceil(totalAddresses / limit);
        
        // Get addresses for current page
        const addresses = allAddresses.slice(skip, skip + limit);

        res.render('user/addressPage', {
            addresses: addresses,
            user: req.session.user,
            hideHeaderSearch: true,
            totalPages: totalPages,
            currentPage: page,
            totalAddresses: totalAddresses,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });

    } catch(error) {
        console.log(error, "error while getting the address page");
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/profile');
    }
};

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { name, streetAddress, city, state, pinCode, phone, altPhone, addressType } = req.body;

        if (!name || !streetAddress || !city || !state || !pinCode || !phone || !addressType) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(pinCode)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter a valid 6-digit pincode'
            });
        }

        if (altPhone && !phoneRegex.test(altPhone)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter a valid alternate phone number'
            });
        }

        const newAddressData = {
            name: name.trim(),
            streetAddress: streetAddress.trim(),
            city: city.trim(),
            state: state.trim(),
            pinCode: parseInt(pinCode),
            phone: parseInt(phone),
            altPhone: altPhone ? parseInt(altPhone) : null,
            addressType,
            isDefault: false
        };

        let userAddresses = await Address.findOne({ userId });

        if (userAddresses) {
            userAddresses.address.push(newAddressData);
            await userAddresses.save();
        } else {
            userAddresses = new Address({
                userId,
                address: [newAddressData]
            });
            await userAddresses.save();
        }

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Address added successfully'
        });

    } catch (error) {
        console.error('Add address error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || 'Failed to add address'
        });
    }
};

const getEditAddress = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;

        const userAddresses = await Address.findOne({ userId });
        
        if (!userAddresses) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Address not found' });
        }

        const address = userAddresses.address.id(addressId);
        
        if (!address) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Address not found' });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            address: address
        });

    } catch(error) {
        console.error('Get edit address error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to get address' });
    }
};

const updateAddress = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;
        const { name, streetAddress, city, state, pinCode, phone, altPhone, addressType } = req.body;

        // Validation
        if (!name || !streetAddress || !city || !state || !pinCode || !phone || !addressType) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'All required fields must be filled'
            });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(pinCode)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter a valid 6-digit pincode'
            });
        }

        if (altPhone && !phoneRegex.test(altPhone)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter a valid alternate phone number'
            });
        }

        const result = await Address.updateOne(
            { userId, 'address._id': addressId },
            {
                $set: {
                    'address.$.name': name.trim(),
                    'address.$.streetAddress': streetAddress.trim(),
                    'address.$.city': city.trim(),
                    'address.$.state': state.trim(),
                    'address.$.pinCode': parseInt(pinCode),
                    'address.$.phone': parseInt(phone),
                    'address.$.altPhone': altPhone ? parseInt(altPhone) : null,
                    'address.$.addressType': addressType
                }
            }
        );

        if (result.modifiedCount > 0) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Address updated successfully'
            });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Address not found'
            });
        }

    } catch(error) {
        console.error('Update address error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update address'
        });
    }
};

const deleteAddress = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;

        const result = await Address.updateOne(
            { userId },
            { $pull: { address: { _id: addressId } } }
        );

        if (result.modifiedCount > 0) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Address deleted successfully'
            });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Address not found'
            });
        }

    } catch(error) {
        console.error('Delete address error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to delete address'
        });
    }
};

const setDefaultAddress = async(req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;

        // Find the user's address document
        const userAddresses = await Address.findOne({ userId });
        
        if (!userAddresses) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'No addresses found'
            });
        }

        // Check if the address exists
        const addressExists = userAddresses.address.some(addr => addr._id.toString() === addressId);
        
        if (!addressExists) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Address not found'
            });
        }

        // Set all addresses to non-default
        userAddresses.address.forEach(addr => {
            addr.isDefault = false;
        });

        // Set the selected address as default
        const selectedAddress = userAddresses.address.find(addr => addr._id.toString() === addressId);
        if (selectedAddress) {
            selectedAddress.isDefault = true;
        }

        await userAddresses.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Default address updated successfully'
        });

    } catch(error) {
        console.error('Set default address error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to set default address'
        });
    }
};

export default { 
    AddressPage,
    addAddress,
    getEditAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
