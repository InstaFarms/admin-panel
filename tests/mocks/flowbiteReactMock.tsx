import React from 'react';

export const mockFlowbiteReactFactory = async (importOriginal: () => Promise<any>) => {
    const actual = await importOriginal();
    return {
        ...actual,
        Modal: ({ show, children }: { show: boolean; children: React.ReactNode }) => (
            show ? <div role="dialog">{children}</div> : null
        ),
        ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        ModalBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        Button: ({ children, onClick, disabled, ...props }: any) => (
            <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
        ),
        Textarea: (props: any) => <textarea {...props} />,
        Label: ({ value, children, ...props }: any) => <label {...props}>{value || children}</label>,
    };
};
