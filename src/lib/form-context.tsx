"use client";

import React, { createContext, useContext, useReducer, useRef, ReactNode } from "react";
import {
  BasicInfo,
  FacilityCategory,
  FacilityEntry,
  GeoLocation,
} from "@/types";

export interface BookedAppointment {
  start: string;
  end: string;
  label: string;
}

export interface FormState {
  currentStep: number;
  basicInfo: BasicInfo;
  facilities: Record<FacilityCategory, FacilityEntry[]>;
  facilityNotApplicable: Record<FacilityCategory, boolean>;
  addressGeoLocation: GeoLocation | null;
  accidentGeoLocation: GeoLocation | null;
  bookedAppointment: BookedAppointment | null;
  clinicId: string | null;
  clinicName: string | null;
}

type FormAction =
  | { type: "SET_BASIC_INFO"; payload: BasicInfo }
  | {
      type: "SET_GEO_LOCATIONS";
      payload: {
        addressGeoLocation?: GeoLocation | null;
        accidentGeoLocation?: GeoLocation | null;
      };
    }
  | {
      type: "SET_FACILITY_NOT_APPLICABLE";
      payload: { category: FacilityCategory; value: boolean };
    }
  | { type: "ADD_FACILITY"; payload: { category: FacilityCategory; entry: FacilityEntry } }
  | { type: "REMOVE_FACILITY"; payload: { category: FacilityCategory; id: string } }
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_BOOKED_APPOINTMENT"; payload: BookedAppointment }
  | { type: "RESET" };

const defaultBasicInfo: BasicInfo = {
  name: "",
  nameKana: "",
  gender: "",
  birthDate: "",
  postalCode: "",
  address: "",
  phoneNumber: "",
  occupation: "",
  accidentDate: "",
  accidentLocation: "",
  yourVehicle: "",
  otherVehicle: "",
  accidentType: "",
  accidentDescription: "",
  faultRatioNotified: "",
  faultRatio: "",
  treatmentPaymentStatus: [],
  otherInsuranceCompany: "",
  otherInsuranceContact: "",
  myInsuranceCompany: "",
  lawyerSpecialClause: "",
  personalInjuryClause: "",
  accidentCertificateType: "",
  hasAccidentPhotos: "",
  remarks: "",
};

const defaultState: FormState = {
  currentStep: 0,
  basicInfo: defaultBasicInfo,
  facilities: {
    orthopedic: [],
    osteopathic: [],
    pharmacy: [],
  },
  facilityNotApplicable: {
    orthopedic: false,
    osteopathic: false,
    pharmacy: false,
  },
  addressGeoLocation: null,
  accidentGeoLocation: null,
  bookedAppointment: null,
  clinicId: null,
  clinicName: null,
};

export interface FormInitialState {
  basicInfo?: Partial<BasicInfo>;
  facilities?: Partial<Record<FacilityCategory, FacilityEntry[]>>;
  facilityNotApplicable?: Partial<Record<FacilityCategory, boolean>>;
  clinicId?: string | null;
  clinicName?: string | null;
}

function buildInitialState(initial?: FormInitialState): FormState {
  if (!initial) return defaultState;
  return {
    ...defaultState,
    basicInfo: { ...defaultBasicInfo, ...(initial.basicInfo ?? {}) },
    facilities: {
      orthopedic: initial.facilities?.orthopedic ?? [],
      osteopathic: initial.facilities?.osteopathic ?? [],
      pharmacy: initial.facilities?.pharmacy ?? [],
    },
    facilityNotApplicable: {
      orthopedic: initial.facilityNotApplicable?.orthopedic ?? false,
      osteopathic: initial.facilityNotApplicable?.osteopathic ?? false,
      pharmacy: initial.facilityNotApplicable?.pharmacy ?? false,
    },
    clinicId: initial.clinicId ?? null,
    clinicName: initial.clinicName ?? null,
  };
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_BASIC_INFO":
      return { ...state, basicInfo: action.payload };
    case "SET_GEO_LOCATIONS":
      return {
        ...state,
        addressGeoLocation:
          action.payload.addressGeoLocation !== undefined
            ? action.payload.addressGeoLocation
            : state.addressGeoLocation,
        accidentGeoLocation:
          action.payload.accidentGeoLocation !== undefined
            ? action.payload.accidentGeoLocation
            : state.accidentGeoLocation,
      };
    case "SET_FACILITY_NOT_APPLICABLE":
      return {
        ...state,
        facilityNotApplicable: {
          ...state.facilityNotApplicable,
          [action.payload.category]: action.payload.value,
        },
      };
    case "ADD_FACILITY":
      return {
        ...state,
        facilities: {
          ...state.facilities,
          [action.payload.category]: [
            ...state.facilities[action.payload.category],
            action.payload.entry,
          ],
        },
        facilityNotApplicable: {
          ...state.facilityNotApplicable,
          [action.payload.category]: false,
        },
      };
    case "REMOVE_FACILITY":
      return {
        ...state,
        facilities: {
          ...state.facilities,
          [action.payload.category]: state.facilities[
            action.payload.category
          ].filter((entry) => entry.id !== action.payload.id),
        },
      };
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "SET_BOOKED_APPOINTMENT":
      return { ...state, bookedAppointment: action.payload };
    case "RESET":
      return { ...defaultState, clinicId: state.clinicId, clinicName: state.clinicName };
    default:
      return state;
  }
}

interface FormContextValue {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  accidentFilesRef: React.MutableRefObject<File[]>;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

export function FormProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: FormInitialState;
}) {
  const [state, dispatch] = useReducer(
    formReducer,
    initialState,
    buildInitialState,
  );
  const accidentFilesRef = useRef<File[]>([]);

  return (
    <FormContext.Provider value={{ state, dispatch, accidentFilesRef }}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormContext(): FormContextValue {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
}
