import { Provider } from '../../types';
import { IAIProvider } from './interfaces';
import { GoogleProvider } from './GoogleProvider';
import { ExternalProvider } from './ExternalProvider';

export const getProvider = (providerType: Provider): IAIProvider => {
    switch (providerType) {
        case Provider.GOOGLE:
            return new GoogleProvider();
        case Provider.OPENAI:
            return new ExternalProvider(false);
        case Provider.CUSTOM:
            return new ExternalProvider(true);
        default:
            return new GoogleProvider();
    }
};