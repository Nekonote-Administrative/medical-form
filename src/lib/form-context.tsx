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

interface FormState {
  currentStep: number;
  basicInfo: BasicInfo;
  facilities: Record<FacilityCategory, FacilityEntry[]>;
  addressGeoLocation: GeoLocation | null;
  accidentGeoLocation: GeoLocation | null;
  bookedAppointment: BookedAppointment | null;
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
  | { type: "ADD_FACILITY"; payload: { category: FacilityCategory; entry: FacilityEntry } }
  | { type: "REMOVE_FACILITY"; payload: { category: FacilityCategory; id: string } }
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_BOOKED_APPOINTMENT"; payload: BookedAppointment }
  | { type: "RESET" };

const initialState: FormState = {
  currentStep: 0,
  basicInfo: {
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
  },
  facilities: {
    orthopedic: [],
    osteopathic: [],
    pharmacy: [],
  },
  addressGeoLocation: null,
  accidentGeoLocation: null,
  bookedAppointment: null,
};

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
      return initialState;
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

export function FormProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(formReducer, initialState);
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
