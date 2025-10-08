const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    maxlength: [100, "Full name cannot exceed 100 characters"]
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true
  },
  country: {
    type: String,
    required: [true, "Country is required"],
    default: "AE",
    enum: {
      values: ["AE", "SA", "KW", "QA", "BH", "OM", "US", "UK", "CA"],
      message: "Invalid country code"
    }
  },
  city: {
    type: String,
    required: [true, "City is required"],
    trim: true,
    maxlength: [50, "City name cannot exceed 50 characters"]
  },
  area: {
    type: String,
    required: [true, "Area is required"],
    trim: true,
    maxlength: [100, "Area name cannot exceed 100 characters"]
  },
  addressLine1: {
    type: String,
    required: [true, "Address line 1 is required"],
    trim: true,
    maxlength: [200, "Address line 1 cannot exceed 200 characters"]
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: [200, "Address line 2 cannot exceed 200 characters"],
    default: ""
  },
  type: {
    type: String,
    enum: {
      values: ["home", "work", "other"],
      message: "Address type must be home, work, or other"
    },
    default: "home"
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const userProfileSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true
  },
  country: {
    type: String,
    required: [true, "Country is required"],
    default: "AE",
    enum: {
      values: ["AE", "SA", "KW", "QA", "BH", "OM", "US", "UK", "CA"],
      message: "Invalid country code"
    }
  },
  profilePicture: {
    type: String,
    default: ""
  },
  addresses: [addressSchema],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt for the user
});

// Middleware to ensure only one default address
userProfileSchema.pre('save', function(next) {
  if (this.addresses && this.addresses.length > 0) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
    
    // If multiple addresses are marked as default, keep only the first one
    if (defaultAddresses.length > 1) {
      let foundFirst = false;
      this.addresses.forEach(addr => {
        if (addr.isDefault) {
          if (!foundFirst) {
            foundFirst = true;
          } else {
            addr.isDefault = false;
          }
        }
      });
    }
    
    // If no default address, set the first one as default
    if (defaultAddresses.length === 0) {
      this.addresses[0].isDefault = true;
    }
  }
  next();
});

// Method to set default address
userProfileSchema.methods.setDefaultAddress = function(addressId) {
  this.addresses.forEach(addr => {
    addr.isDefault = addr._id.toString() === addressId.toString();
  });
  return this.save();
};

// Method to get default address
userProfileSchema.methods.getDefaultAddress = function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

// Static method to find user by email
userProfileSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Virtual for full user info (excluding sensitive data)
userProfileSchema.virtual('userInfo').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    country: this.country,
    profilePicture: this.profilePicture,
    addresses: this.addresses,
    preferences: this.preferences
  };
});

// Ensure virtual fields are serialized
userProfileSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  }
});

module.exports = mongoose.model("UserProfile", userProfileSchema);